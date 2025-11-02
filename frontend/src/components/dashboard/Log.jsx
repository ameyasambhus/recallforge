import React, { useContext } from "react";
import { AppContent } from "../../context/AppContext";
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const Log = () => {
  const { userData } = useContext(AppContent);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [folder, setFolder] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAnswer = async () => {
    if (!question.trim()) {
      toast.error("Please enter a question first");
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
        throw new Error("Failed to generate answer");
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
              break;
            }
            
            if (data.text) {
              // Append text chunk to answer
              setAnswer((prev) => prev + data.text);
            }
          }
        }
      }
    } catch (error) {
      toast.error("Failed to generate answer");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const submitCard = async () => {
    try {
      axios.defaults.withCredentials = true;
      if (!question || !answer || !folder) {
        toast.error("Please fill all fields");
        return;
      }
      const { data } = await axios.post("/api/card/log", {
        question,
        answer,
        folder,
      });
      if (data.success) {
        toast.success("Card added successfully");
        setQuestion("");
        setAnswer("");
        setFolder("");
      } else {
        toast.error(data.message);
        console.log(data.message);
      }
    } catch (error) {
      toast.error("An error occurred");
      console.log(error.message);
    }
  };
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
            disabled={isGenerating || !question.trim()}
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
          
          <textarea
            id="aInput"
            placeholder="Answer (revealed after recall)"
            className="w-full rounded-xl border border-gray-600 bg-[#1f262d] p-3 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring focus:ring-indigo-500/40"
            onChange={(e) => setAnswer(e.target.value)}
            value={answer}
            rows={3}
          />
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

        <button
          onClick={submitCard}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-white font-medium shadow-md hover:bg-indigo-500"
        >
          Add Card
        </button>
      </div>
    </div>
  );
};

export default Log;
