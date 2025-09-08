import { Delete, Trash, Trash2 } from "lucide-react";
import React from "react";
import { useState } from "react";

const Card = ({ card, onDelete }) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [wantDelete, setWantDelete] = useState(false);
  return (
    <div className="w-full rounded-xl border border-white/10 bg-[#38424d] p-4 shadow-md mb-4">
      <div className="mb-2">
        <span className="font-bold text-lg">Q: </span>
        <span className="text-neutral-100">{card.question}</span>
      </div>
      <button
        className="btn btn-sm btn-primary"
        onClick={() =>
          !showAnswer ? setShowAnswer(true) : setShowAnswer(false)
        }
      >
        {showAnswer ? "Hide Answer" : "Show Answer"}
      </button>
      {showAnswer ? (
        <div className="mb-2">
          <span className="font-bold text-lg mt-5">A: </span>
          <span className="text-neutral-400">{card.answer}</span>
        </div>
      ) : (
        <div></div>
      )}

      <div className="mb-2 mt-2">
        <span className="font-bold">Folder: </span>
        <span>{card.folder || "Uncategorized"}</span>
      </div>
      <div className="mb-2">
        <span className="font-bold">Next Due: </span>
        <span>{new Date(card.dueDate).toLocaleDateString()}</span>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          className="btn btn-sm btn-error"
          onClick={() => {
            !wantDelete ? setWantDelete(true) : setWantDelete(false);
          }}
        >
          Delete
        </button>

        {wantDelete ? (
          <div>
            <span>Are you sure to delete? </span>
            <button
              className="btn btn-sm btn-error"
              onClick={() => {
                onDelete(card._id);
              }}
            >
              Confirm
            </button>
          </div>
        ) : (
          <div></div>
        )}
      </div>
    </div>
  );
};

export default Card;
