import React from "react";
import { Download, FileText, PlayCircle } from "lucide-react";
import axios from "axios";

const CardMediaPreview = ({ media = [], onMediaClick }) => {
  if (!media.length) return null;

  const triggerDownload = async (item) => {
    try {
      const response = await axios.get(item.download_url || item.url, {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = item.file_name || "attachment";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to download attachment:", error);
    }
  };

  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-gray-300 mb-2">Attachments</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {media.map((item, index) => {
          if (item.media_type === "image") {
            return (
              <div key={item.id} className="rounded-lg overflow-hidden border border-white/10 bg-[#1f262d]">
                <button
                  type="button"
                  onClick={() => onMediaClick?.(index)}
                  className="block w-full"
                >
                  <img src={item.url} alt={item.file_name || "card attachment"} className="w-full h-36 object-cover" />
                </button>
                <button type="button" onClick={() => triggerDownload(item)} className="w-full flex items-center justify-center gap-1.5 text-xs text-indigo-300 py-2 hover:bg-white/5">
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            );
          }

          if (item.media_type === "video") {
            return (
              <div key={item.id} className="rounded-lg overflow-hidden border border-white/10 bg-[#1f262d]">
                <button
                  type="button"
                  onClick={() => onMediaClick?.(index)}
                  className="relative w-full"
                >
                  <video src={item.url} className="w-full h-36 object-cover pointer-events-none" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <PlayCircle className="w-8 h-8 text-white" />
                  </div>
                </button>
                <button type="button" onClick={() => triggerDownload(item)} className="w-full flex items-center justify-center gap-1.5 text-xs text-indigo-300 py-2 hover:bg-white/5">
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            );
          }

          return (
            <div key={item.id} className="rounded-lg border border-white/10 bg-[#1f262d] overflow-hidden">
              <button
                type="button"
                onClick={() => onMediaClick?.(index)}
                className="w-full flex items-center gap-2 p-3 text-gray-200 hover:bg-[#252d36]"
              >
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="text-sm truncate">{item.file_name || "PDF file"}</span>
              </button>
              <button type="button" onClick={() => triggerDownload(item)} className="w-full flex items-center justify-center gap-1.5 text-xs text-indigo-300 py-2 hover:bg-white/5">
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CardMediaPreview;
