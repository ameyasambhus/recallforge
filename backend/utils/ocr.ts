/// <reference lib="dom" />
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { createWorker } from "tesseract.js";
import sharp from "sharp";
import { generateEmbedding } from "./embedding.js";
import cardMediaModel, { OcrStatus } from "../models/cardMediaModel.js";

const MIN_TEXT_LENGTH = 10;
const execFileAsync = promisify(execFile);

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

async function setOcrStatus(mediaId: number, status: OcrStatus) {
  await cardMediaModel.updateOcrStatus(mediaId, status);
}

function isPdfUrl(url: string): boolean {
  return url.toLowerCase().includes(".pdf");
}

async function downloadToBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function runTesseractOnImageBuffer(buffer: Buffer): Promise<string> {
  const worker = await createWorker("eng");
  try {
    const processed = await sharp(buffer).grayscale().normalize().toBuffer();
    const result = await worker.recognize(processed);
    return result.data.text || "";
  } finally {
    await worker.terminate();
  }
}

async function runTesseractOnImages(imagePaths: string[]): Promise<string> {
  const worker = await createWorker("eng");
  try {
    const texts: string[] = [];
    for (const imagePath of imagePaths) {
      const result = await worker.recognize(imagePath);
      if (result.data.text) {
        texts.push(result.data.text);
      }
    }
    return texts.join("\n");
  } finally {
    await worker.terminate();
  }
}

async function convertPdfToPngs(
  pdfPath: string,
  outputDir: string,
  prefix: string,
): Promise<string[]> {
  await execFileAsync("pdftoppm", ["-png", "-r", "200", pdfPath, path.join(outputDir, prefix)]);
  const files = await fs.readdir(outputDir);
  return files
    .filter((name) => name.startsWith(`${prefix}-`) && name.endsWith(".png"))
    .sort((a, b) => {
      const aNum = Number(a.match(/-(\d+)\.png$/)?.[1] || 0);
      const bNum = Number(b.match(/-(\d+)\.png$/)?.[1] || 0);
      return aNum - bNum;
    })
    .map((name) => path.join(outputDir, name));
}

export async function extractTextFromMedia(
  mediaId: number,
  url: string,
  mediaType: string,
): Promise<void> {
  await setOcrStatus(mediaId, "processing");

  try {
    if (mediaType === "video") {
      await setOcrStatus(mediaId, "skipped");
      return;
    }

    let extractedText = "";

    if (mediaType === "image") {
      const buffer = await downloadToBuffer(url);
      extractedText = await runTesseractOnImageBuffer(buffer);
    } else if (mediaType === "file" && isPdfUrl(url)) {
      const tmpDir = await fs.mkdtemp(
        path.join(os.tmpdir(), `recallforge-ocr-${mediaId}-`),
      );
      const pdfPath = path.join(tmpDir, "source.pdf");

      try {
        const buffer = await downloadToBuffer(url);
        await fs.writeFile(pdfPath, buffer);

        const pageFiles = await convertPdfToPngs(pdfPath, tmpDir, "page");

        if (pageFiles.length) {
          extractedText = await runTesseractOnImages(pageFiles);
        }
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    } else {
      await setOcrStatus(mediaId, "skipped");
      return;
    }

    const cleaned = extractedText.trim();
    if (cleaned.length < MIN_TEXT_LENGTH) {
      await setOcrStatus(mediaId, "skipped");
      return;
    }

    const embeddingValues = await generateEmbedding(cleaned);
    const embedding = toVectorLiteral(embeddingValues);

    await cardMediaModel.updateOcrResult(mediaId, {
      extracted_text: cleaned,
      text_embedding: embedding,
    });
  } catch (error) {
    console.error(`OCR failed for media ${mediaId}:`, error);
    try {
      await setOcrStatus(mediaId, "failed");
    } catch (innerError) {
      console.error(
        `Failed to update OCR status for media ${mediaId}:`,
        innerError,
      );
    }
  }
}
