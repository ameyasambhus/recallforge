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
        {userData ? userData.name : ""}, Add New Study Card
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

        <textarea
          id="aInput"
          placeholder="Answer (revealed after recall)"
          className="w-full rounded-xl border border-gray-600 bg-[#1f262d] p-3 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring focus:ring-indigo-500/40"
          onChange={(e) => setAnswer(e.target.value)}
          value={answer}
          rows={3}
        />

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
