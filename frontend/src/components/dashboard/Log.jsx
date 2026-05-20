import React, { useContext, useEffect, useState, useRef } from "react";
import { AppContent } from "../../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";
import MDEditor from "@uiw/react-md-editor";
import { FileText, Image as ImageIcon, PlayCircle, Upload } from "lucide-react";
import { MAX_FILE_SIZE_BYTES, PLAN_LABELS, PLAN_LIMITS } from "../../constants/subscription";

const LOG_STORAGE_KEY = "recallforge_log_draft";

const Log = () => {
  const { userData, getUserData } = useContext(AppContent);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [folder, setFolder] = useState("");
  const [folders, setFolders] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaFilePreviews, setMediaFilePreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef(null);
  const activePlan = userData?.subscription?.plan || "free";
  const aiAnswersLimit =
    userData?.subscription?.aiAnswersLimit ?? PLAN_LIMITS[activePlan].aiAnswers;
  const aiUsedThisMonth = userData?.subscription?.aiUsageThisMonth || 0;
  const mediaFilesLimit =
    userData?.subscription?.mediaFilesLimit ?? PLAN_LIMITS[activePlan].mediaFiles;

  // Fetch available folders for autocomplete
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const { data } = await axios.get("/api/card/folders");
        if (data.success) {
          setFolders(data.folders);
        }
      } catch (error) {
        console.error("Failed to fetch folders:", error);
      }
    };
    fetchFolders();
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(LOG_STORAGE_KEY);
    if (savedData) {
      try {
        const { question: savedQuestion, answer: savedAnswer, folder: savedFolder } = JSON.parse(savedData);
        if (savedQuestion) setQuestion(savedQuestion);
        if (savedAnswer) setAnswer(savedAnswer);
        if (savedFolder) setFolder(savedFolder);
      } catch (error) {
        console.error("Failed to load draft from localStorage:", error);
      }
    }
  }, []);

  // Save to localStorage whenever question, answer, or folder changes
  useEffect(() => {
    const dataToSave = { question, answer, folder };
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(dataToSave));
  }, [question, answer, folder]);

  const generateAnswer = async () => {
    if (!question.trim()) {
      toast.error("Please enter a question first");
      return;
    }
    if (aiUsedThisMonth >= aiAnswersLimit) {
      toast.error(`AI limit reached (${aiAnswersLimit}/${aiAnswersLimit}) for ${PLAN_LABELS[activePlan]} plan`);
      return;
    }

    setIsGenerating(true);
    setAnswer(""); // Clear previous answer

    try {
      const response = await fetch("/api/card/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        let message = "Failed to generate answer";
        try {
          const payload = await response.json();
          if (payload?.error) message = payload.error;
        } catch {
          // Ignore JSON parse failure.
        }
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        
        // Parse SSE format (data: {...}\n\n)
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              toast.error(data.error);
              break;
            }
            
            if (data.done) {
              toast.success("Answer generated!");
              await getUserData();
              break;
            }

            if (data.subscription) {
              await getUserData();
            }
            
            if (data.text) {
              // Append text chunk to answer
              setAnswer((prev) => prev + data.text);
            }
          }
        }
      }
    } catch (error) {
      toast.error(error?.message || "Failed to generate answer");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const submitCard = async () => {
    if (isSubmitting) return;
    try {
      axios.defaults.withCredentials = true;
      if (!question || !answer || !folder) {
        toast.error("Please fill all fields");
        return;
      }
      if (mediaFiles.length > mediaFilesLimit) {
        toast.error(`Your ${PLAN_LABELS[activePlan]} plan allows maximum ${mediaFilesLimit} attachment(s)`);
        return;
      }
      setIsSubmitting(true);
      setUploadProgress(0);
      const formData = new FormData();
      formData.append("question", question);
      formData.append("answer", answer);
      formData.append("folder", folder);
      mediaFiles.forEach((file) => formData.append("media", file));

      const { data } = await axios.post("/api/card/log", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || 0;
          if (!total) return;
          const percent = Math.round((progressEvent.loaded * 100) / total);
          setUploadProgress(Math.max(1, Math.min(percent, 100)));
        },
      });
      if (data.success) {
        toast.success("Card added successfully");
        setQuestion("");
        setAnswer("");
        setFolder("");
        setMediaFiles([]);
        setUploadProgress(0);
        // Clear localStorage after successful submission
        localStorage.removeItem(LOG_STORAGE_KEY);
      } else {
        toast.error(data.message);
        console.log(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Upload failed");
      console.log(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const processFiles = (filesList) => {
    const selectedFiles = Array.from(filesList || []);
    if (!selectedFiles.length) return;

    const isValidFile = (file) => {
      const validType =
        file.type.startsWith("image/") ||
        file.type.startsWith("video/") ||
        file.type === "application/pdf";
      return validType && file.size <= MAX_FILE_SIZE_BYTES;
    };

    const invalidFile = selectedFiles.find((file) => !isValidFile(file));
    if (invalidFile) {
      toast.error("Only image/video/PDF files up to 2 MB are allowed");
      return;
    }

    if (mediaFilesLimit <= 0) {
      toast.error("Media uploads are available on Pro and Max plans only");
      return;
    }

    setMediaFiles((prev) => {
      const merged = [...prev];

      selectedFiles.forEach((file) => {
        const exists = merged.some(
          (f) =>
            f.name === file.name &&
            f.size === file.size &&
            f.lastModified === file.lastModified
        );
        if (!exists) merged.push(file);
      });

      if (merged.length > mediaFilesLimit) {
        toast.error(`You can upload maximum ${mediaFilesLimit} file(s) on ${PLAN_LABELS[activePlan]} plan`);
        return merged.slice(0, mediaFilesLimit);
      }

      return merged;
    });
  };

  const handleFileSelection = (event) => {
    processFiles(event.target.files);
    event.target.value = "";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setDragCounter((prev) => {
      const next = prev + 1;
      if (next === 1 && mediaFilesLimit > 0) {
        setIsDragging(true);
      }
      return next;
    });
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragCounter((prev) => {
      const next = Math.max(0, prev - 1);
      if (next === 0) {
        setIsDragging(false);
      }
      return next;
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setDragCounter(0);
    if (mediaFilesLimit <= 0) {
      toast.error("Media uploads are available on Pro and Max plans only");
      return;
    }
    processFiles(e.dataTransfer.files);
  };

  const handleRemoveSelectedFile = (fileToRemove) => {
    setMediaFiles((prev) =>
      prev.filter(
        (file) =>
          !(
            file.name === fileToRemove.name &&
            file.size === fileToRemove.size &&
            file.lastModified === fileToRemove.lastModified
          )
      )
    );
  };

  useEffect(() => {
    const previews = mediaFiles.map((file) => ({
      key: `${file.name}-${file.lastModified}-${file.size}`,
      file,
      previewUrl: file.type === "application/pdf" ? null : URL.createObjectURL(file),
    }));
    setMediaFilePreviews(previews);

    return () => {
      previews.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [mediaFiles]);

  useEffect(() => {
    if (mediaFilesLimit === 0 && mediaFiles.length) {
      setMediaFiles([]);
      return;
    }
    if (mediaFiles.length > mediaFilesLimit) {
      setMediaFiles((prev) => prev.slice(0, mediaFilesLimit));
    }
  }, [mediaFiles, mediaFilesLimit]);
  return (
    <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#272e36] p-8 shadow-lg">
      <h2 className="text-2xl font-semibold text-white mb-4 text-center">
        Add New Study Card
      </h2>

      <div className="space-y-3">
        <textarea
          id="qInput"
          placeholder="Question (what to recall)"
          className="w-full rounded-xl border border-gray-600 bg-[#1f262d] p-3 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring focus:ring-indigo-500/40"
          onChange={(e) => setQuestion(e.target.value)}
          value={question}
          rows={3}
        />

        <div className="space-y-2">
          <button
            onClick={generateAnswer}
            disabled={isGenerating || !question.trim() || aiUsedThisMonth >= aiAnswersLimit}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-medium hover:bg-indigo-600/30 hover:border-indigo-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin">⏳</span>
                Generating...
              </>
            ) : (
              <>
                <span>✨</span>
                Generate answer using AI
              </>
            )}
          </button>
          <p className="text-xs text-gray-400">
            AI usage this month: {aiUsedThisMonth}/{aiAnswersLimit} ({PLAN_LABELS[activePlan]} plan)
          </p>
          
          <div data-color-mode="dark" className="rounded-xl overflow-hidden border border-white/5 shadow-inner">
            <MDEditor
              value={answer}
              onChange={(val) => setAnswer(val || "")}
              preview="edit"
              textareaProps={{
                placeholder: "Answer (Markdown supported, revealed after recall)"
              }}
            />
          </div>
        </div>

        <input
          type="text"
          list="folderList"
          id="folderInput"
          placeholder="Folder (e.g., Math)"
          className="w-full rounded-xl border border-gray-600 bg-[#1f262d] p-3 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring focus:ring-indigo-500/40"
          onChange={(e) => setFolder(e.target.value)}
          value={folder}
        />
        <datalist id="folderList">
          {folders.map((f, i) => (
            <option key={i} value={f.name} />
          ))}
        </datalist>

        <div
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-xl border border-dashed p-4 transition-all duration-300 ${
            isDragging
              ? "border-indigo-500 bg-indigo-950/40 shadow-[0_0_20px_rgba(99,102,241,0.2)] scale-[1.01]"
              : "border-gray-600 bg-[#1f262d] hover:border-gray-500"
          }`}
        >
          {isDragging && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#1f262d]/95 rounded-xl backdrop-blur-sm animate-fadeIn">
              <div className="absolute inset-0 bg-indigo-500/5 rounded-xl animate-pulse-glow" />
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 animate-float shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-white mt-2">Drop your files here</span>
                <span className="text-xs text-gray-400">Accepts image, video, or PDF up to 2MB</span>
              </div>
            </div>
          )}

          <div
            className={`flex flex-col items-center justify-center py-4 cursor-pointer group ${
              mediaFilesLimit === 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={() => {
              if (mediaFilesLimit > 0) {
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,application/pdf"
              onChange={handleFileSelection}
              disabled={mediaFilesLimit === 0}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-full bg-[#272e36] border border-white/5 flex items-center justify-center text-gray-400 group-hover:text-indigo-400 group-hover:bg-indigo-600/10 group-hover:border-indigo-500/30 transition-all duration-300">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-gray-300 mt-2 text-center">
              <span className="text-indigo-400 hover:text-indigo-300 font-semibold underline">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1 text-center">
              {mediaFilesLimit === 0
                ? "Attachments are disabled on Free plan. Upgrade to Pro/Max."
                : `Up to ${mediaFilesLimit} file(s) on ${PLAN_LABELS[activePlan]} plan. Max 2 MB each.`}
            </p>
          </div>

          {!!mediaFilePreviews.length && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
              {mediaFilePreviews.map(({ key, file, previewUrl }) => (
                <div key={key} className="relative rounded-md border border-white/10 bg-[#202733] overflow-hidden">
                  {file.type.startsWith("image/") && previewUrl && (
                    <img src={previewUrl} alt={file.name} className="w-full h-24 object-cover" />
                  )}
                  {file.type.startsWith("video/") && previewUrl && (
                    <div className="relative">
                      <video src={previewUrl} className="w-full h-24 object-cover pointer-events-none" />
                      <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                        <PlayCircle className="w-7 h-7 text-white" />
                      </div>
                    </div>
                  )}
                  {file.type === "application/pdf" && (
                    <div className="h-24 flex items-center justify-center gap-2 text-indigo-300 bg-[#202733]">
                      <FileText className="w-5 h-5" />
                      <span className="text-sm">PDF</span>
                    </div>
                  )}
                  <div className="px-2 py-1.5 text-xs text-gray-300 truncate flex items-center gap-1.5">
                    {file.type.startsWith("image/") ? <ImageIcon className="w-3.5 h-3.5 text-blue-300" /> : file.type.startsWith("video/") ? <PlayCircle className="w-3.5 h-3.5 text-purple-300" /> : <FileText className="w-3.5 h-3.5 text-indigo-300" />}
                    <span className="truncate">{file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSelectedFile(file)}
                    className="absolute top-2 right-2 p-1.5 rounded-md text-red-300 bg-black/40 hover:bg-red-500/30"
                    title="Discard selected file"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={submitCard}
          disabled={isSubmitting}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-white font-medium shadow-md hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Uploading..." : "Add Card"}
        </button>

        {isSubmitting && (
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-600/10 p-3">
            <div className="flex justify-between text-xs text-indigo-200 mb-2">
              <span>Uploading media and saving card...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-[#1f262d] overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Log;
