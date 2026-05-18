import { Readable } from 'node:stream';
import cloudinary from '../config/cloudinary.js';
import cardMediaModel, { CardMedia } from '../models/cardMediaModel.js';
import cardModel from '../models/cardModel.js';
import axios from 'axios';
import { assertMediaUploadAllowed } from './subscription.service.js';

function resolveMediaType(mimeType: string): 'image' | 'video' | 'file' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'file';
}

function getCloudinaryResourceType(mediaType: 'image' | 'video' | 'file') {
  if (mediaType === 'file') return 'raw';
  return mediaType;
}

function getUploadConfigByMimeType(mimeType: string): {
  resource_type: 'image' | 'video' | 'raw';
  format?: string;
  type: 'upload' | 'authenticated';
} {
  if (mimeType === 'application/pdf') {
    // Keep PDFs on public upload delivery for simpler rendering/downloading.
    return { resource_type: 'image', format: 'pdf', type: 'upload' };
  }
  if (mimeType.startsWith('image/')) return { resource_type: 'image', type: 'authenticated' };
  if (mimeType.startsWith('video/')) return { resource_type: 'video', type: 'authenticated' };
  return { resource_type: 'raw', type: 'authenticated' };
}

function extractResourceTypeFromUrl(url: string): 'image' | 'video' | 'raw' | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((part) => part === 'image' || part === 'video' || part === 'raw');
    if (idx === -1) return null;
    const type = parts[idx];
    if (type === 'image' || type === 'video' || type === 'raw') return type;
    return null;
  } catch {
    return null;
  }
}

function extractDeliveryTypeFromUrl(url: string): 'upload' | 'authenticated' | 'private' | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((part) => part === 'image' || part === 'video' || part === 'raw');
    if (idx === -1 || !parts[idx + 1]) return null;
    const deliveryType = parts[idx + 1];
    if (
      deliveryType === 'upload' ||
      deliveryType === 'authenticated' ||
      deliveryType === 'private'
    ) {
      return deliveryType;
    }
    return null;
  } catch {
    return null;
  }
}

function parseCloudinaryUrl(url: string): {
  resourceType: 'image' | 'video' | 'raw';
  deliveryType: 'upload' | 'authenticated' | 'private';
  publicId: string;
  format?: string;
  version?: string;
} | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const typeIndex = parts.findIndex((part) =>
      part === 'image' || part === 'video' || part === 'raw'
    );
    if (typeIndex === -1) return null;

    const resourceType = parts[typeIndex] as 'image' | 'video' | 'raw';
    const deliveryType = parts[typeIndex + 1] as 'upload' | 'authenticated' | 'private' | undefined;
    if (!deliveryType || !['upload', 'authenticated', 'private'].includes(deliveryType)) {
      return null;
    }

    let start = typeIndex + 2;

    // Authenticated URLs can include a signature path segment: s--xxxxxx--
    if (parts[start]?.startsWith('s--')) {
      start += 1;
    }

    // Prefer content after version segment.
    const versionIndex = parts.findIndex((part, index) => index >= start && /^v\d+$/.test(part));
    const version = versionIndex >= 0 ? parts[versionIndex] : undefined;
    const publicPathParts = versionIndex >= 0 ? parts.slice(versionIndex + 1) : parts.slice(start);
    if (!publicPathParts.length) return null;

    const fullPath = publicPathParts.join('/');
    const extMatch = fullPath.match(/\.([a-zA-Z0-9]+)$/);
    const format = extMatch?.[1];
    const publicId = fullPath.replace(/\.[^/.]+$/, '');
    if (!publicId) return null;

    return { resourceType, deliveryType, publicId, format, version };
  } catch {
    return null;
  }
}

function isAdminEmail(email?: string): boolean {
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '';
  const admins = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (!email) return false;
  return admins.includes(email.toLowerCase());
}

async function assertCardMediaAccess(userId: string, cardId: string, requesterEmail?: string) {
  const card = await cardModel.findById(cardId);
  if (!card) {
    throw new Error('Card not found');
  }
  if (!isAdminEmail(requesterEmail) && String(card.user_id) !== String(userId)) {
    throw new Error('Forbidden');
  }
  return card;
}

function buildProtectedMediaUrl(cardId: string, mediaId: string | number): string {
  return `/api/card/${cardId}/media/${mediaId}/view`;
}

async function deleteFromCloudinaryByPublicId(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw',
  deliveryType: 'upload' | 'authenticated' | 'private' = 'authenticated'
) {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    type: deliveryType,
    invalidate: true,
  });
}

function uploadBufferToCloudinary(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ secure_url: string; public_id: string; resource_type: string }> {
  const uploadConfig = getUploadConfigByMimeType(mimeType);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'recallforge/card-media',
        resource_type: uploadConfig.resource_type,
        type: uploadConfig.type,
        format: uploadConfig.format,
        public_id: `${Date.now()}-${fileName.replace(/\s+/g, '-')}`,
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Cloudinary upload failed'));
          return;
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
        });
      }
    );

    Readable.from(fileBuffer).pipe(uploadStream);
  });
}

export const cardMediaService = {
  async getForCard(userId: string, cardId: string, requesterEmail?: string) {
    if (!/^\d+$/.test(cardId)) {
      throw new Error('Invalid card ID');
    }

    await assertCardMediaAccess(userId, cardId, requesterEmail);

    const media = await cardMediaModel.findByCardId(cardId);
    return media.map((item) => ({
      ...item,
      url: buildProtectedMediaUrl(cardId, item.id),
    }));
  },

  async uploadToCard(
    userId: string,
    cardId: string,
    files: Express.Multer.File[],
    requesterEmail?: string
  ): Promise<CardMedia[]> {
    if (!/^\d+$/.test(cardId)) {
      throw new Error('Invalid card ID');
    }
    if (!files.length) {
      throw new Error('At least one file is required');
    }

    await assertCardMediaAccess(userId, cardId, requesterEmail);

    const existingCount = await cardMediaModel.countByCardId(cardId);
    await assertMediaUploadAllowed(userId, files.length, existingCount);

    const uploads = await Promise.all(
      files.map(async (file) => {
        const uploadResult = await uploadBufferToCloudinary(
          file.buffer,
          file.originalname,
          file.mimetype
        );

        return {
          card_id: cardId,
          url: uploadResult.secure_url,
          media_type: resolveMediaType(file.mimetype),
          file_name: file.originalname,
          size_bytes: file.size,
        };
      })
    );

    const createdMedia = await cardMediaModel.createMany(uploads);
    return createdMedia.map((item) => ({
      ...item,
      url: buildProtectedMediaUrl(cardId, item.id),
    }));
  },

  async uploadFiles(files: Express.Multer.File[]) {
    const uploadedAssets: Array<{ public_id: string; resource_type: string }> = [];
    const uploads: Array<{
      url: string;
      media_type: 'image' | 'video' | 'file';
      file_name: string;
      size_bytes: number;
    }> = [];

    try {
      for (const file of files) {
        const uploadResult = await uploadBufferToCloudinary(
          file.buffer,
          file.originalname,
          file.mimetype
        );
        uploadedAssets.push({
          public_id: uploadResult.public_id,
          resource_type: uploadResult.resource_type,
        });
        uploads.push({
          url: uploadResult.secure_url,
          media_type: resolveMediaType(file.mimetype),
          file_name: file.originalname,
          size_bytes: file.size,
        });
      }

      return uploads;
    } catch (error) {
      await Promise.allSettled(
        uploadedAssets.map((asset) =>
          cloudinary.uploader.destroy(asset.public_id, {
            resource_type: asset.resource_type === 'raw' ? 'raw' : asset.resource_type,
            type: 'authenticated',
            invalidate: true,
          })
        )
      );
      throw error;
    }
  },

  async deleteFromCard(userId: string, cardId: string, mediaId: string, requesterEmail?: string) {
    if (!/^\d+$/.test(cardId) || !/^\d+$/.test(mediaId)) {
      throw new Error('Invalid request');
    }

    await assertCardMediaAccess(userId, cardId, requesterEmail);

    const media = await cardMediaModel.findOneById(mediaId);
    if (!media || String(media.card_id) !== cardId) {
      throw new Error('Media not found');
    }

    const parsedUrl = parseCloudinaryUrl(media.url);
    const publicId = parsedUrl?.publicId || null;
    if (publicId) {
      const resourceType = parsedUrl?.resourceType || extractResourceTypeFromUrl(media.url);
      const deliveryType = parsedUrl?.deliveryType || extractDeliveryTypeFromUrl(media.url) || 'authenticated';
      try {
        if (resourceType) {
          await deleteFromCloudinaryByPublicId(publicId, resourceType, deliveryType);
        } else {
          throw new Error('Unknown resource type');
        }
      } catch {
        // Fallbacks for older assets with unknown URL structure.
        await Promise.allSettled([
          cloudinary.uploader.destroy(publicId, {
            resource_type: 'raw',
            type: 'upload',
            invalidate: true,
          }),
          cloudinary.uploader.destroy(publicId, {
            resource_type: 'image',
            type: 'authenticated',
            invalidate: true,
          }),
        ]);
      }
    }

    await cardMediaModel.deleteById(mediaId);
    return { success: true };
  },

  async deleteAllForCard(userId: string, cardId: string, requesterEmail?: string) {
    if (!/^\d+$/.test(cardId)) {
      throw new Error('Invalid card ID');
    }

    await assertCardMediaAccess(userId, cardId, requesterEmail);

    const media = await cardMediaModel.findByCardId(cardId);
    for (const item of media) {
      const parsedUrl = parseCloudinaryUrl(item.url);
      const publicId = parsedUrl?.publicId || null;
      if (publicId) {
        const resourceType = parsedUrl?.resourceType || extractResourceTypeFromUrl(item.url);
        const deliveryType = parsedUrl?.deliveryType || extractDeliveryTypeFromUrl(item.url) || 'authenticated';
        try {
          if (resourceType) {
            await deleteFromCloudinaryByPublicId(publicId, resourceType, deliveryType);
          } else {
            throw new Error('Unknown resource type');
          }
        } catch {
          await Promise.allSettled([
            cloudinary.uploader.destroy(publicId, {
              resource_type: 'raw',
              type: 'upload',
              invalidate: true,
            }),
            cloudinary.uploader.destroy(publicId, {
              resource_type: 'image',
              type: 'authenticated',
              invalidate: true,
            }),
          ]);
        }
      }
      await cardMediaModel.deleteById(item.id);
    }
  },

  async viewMedia(
    userId: string,
    cardId: string,
    mediaId: string,
    requesterEmail?: string,
    rangeHeader?: string
  ) {
    if (!/^\d+$/.test(cardId) || !/^\d+$/.test(mediaId)) {
      throw new Error('Invalid request');
    }

    await assertCardMediaAccess(userId, cardId, requesterEmail);

    const media = await cardMediaModel.findOneById(mediaId);
    if (!media || String(media.card_id) !== cardId) {
      throw new Error('Media not found');
    }

    const parsed = parseCloudinaryUrl(media.url);
    const headers: Record<string, string> = {};
    if (rangeHeader) {
      headers.Range = rangeHeader;
    }

    let sourceUrl = media.url;
    if (parsed?.deliveryType === 'authenticated') {
      sourceUrl = cloudinary.url(parsed.publicId, {
        resource_type: parsed.resourceType,
        type: 'authenticated',
        sign_url: true,
        secure: true,
        ...(parsed.version ? { version: parsed.version } : {}),
        ...(parsed.format ? { format: parsed.format } : {}),
      });
    }

    let response;
    try {
      response = await axios.get(sourceUrl, {
        responseType: 'stream',
        headers,
        validateStatus: (status) => status >= 200 && status < 400,
      });
    } catch (err: any) {
      // Fallback to stored URL in case this asset already has a valid delivery signature.
      if (err?.response?.status === 401 && sourceUrl !== media.url) {
        response = await axios.get(media.url, {
          responseType: 'stream',
          headers,
          validateStatus: (status) => status >= 200 && status < 400,
        });
      } else {
        throw err;
      }
    }

    const defaultContentType =
      media.media_type === 'file' ? 'application/pdf' : response.headers['content-type'];

    return {
      stream: response.data,
      status: response.status,
      contentType: defaultContentType,
      contentLength: response.headers['content-length'],
      contentRange: response.headers['content-range'],
      acceptRanges: response.headers['accept-ranges'],
      fileName: media.file_name || undefined,
    };
  },
};
