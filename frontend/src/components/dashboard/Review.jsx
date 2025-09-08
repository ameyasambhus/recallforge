import React, { useEffect, useState, useContext } from "react";
import { AppContent } from "../../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";

const Review = () => {
  const [dueCards, setDueCards] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchDueCards = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/card/due");
      if (data.success) {
        setDueCards(data.cards);
      } else {
        toast.error("Error fetching the cards");
      }
    } catch (err) {
      if (err.response.status === 429) {
        toast.error("Too many requests. Please try after some time");
      } else {
        toast.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDueCards();
  }, []);

  const handleReview = async (quality) => {
    const card = dueCards[currentIdx];
    setLoading(true);
    try {
      const { data } = await axios.put(`/api/card/${card._id}/review`, {
        quality,
      });
      if (data.success) {
        setShowAnswer(false);
        setCurrentIdx((idx) => idx + 1);
      } else {
        toast.error("Error storing your recall");
      }
    } catch (err) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  if (loading)
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#272e36] p-8 shadow-lg">
        <div>Loading...</div>
      </div>
    );

  if (!dueCards.length)
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#272e36] p-8 shadow-lg">
        <div>No cards due for review!</div>
      </div>
    );
  if (currentIdx >= dueCards.length)
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#272e36] p-8 shadow-lg">
        <div>All due cards reviewed!</div>
      </div>
    );

  const card = dueCards[currentIdx];

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#272e36] p-8 shadow-lg">
      <div className="mb-4">
        <div className="font-bold text-lg mb-2">Question:</div>
        <div className="text-neutral-100">{card.question}</div>
      </div>
      {showAnswer ? (
        <div className="mb-4">
          <div className="font-bold text-lg mb-2">Answer:</div>
          <div className="text-neutral-400">{card.answer}</div>
        </div>
      ) : (
        <button
          className="btn btn-primary mb-4"
          onClick={() => setShowAnswer(true)}
        >
          Show Answer
        </button>
      )}
      {showAnswer && (
        <div>
          <hr />
          <div className="mb-2 mt-2">How well did you recall?</div>
          <div className="flex gap-2 justify-center items-center">
            {[0, 1, 2, 3, 4, 5].map((q) => (
              <button
                key={q}
                className="btn btn-primary"
                onClick={() => handleReview(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 text-sm text-neutral-500">
        Card {currentIdx + 1} of {dueCards.length}
      </div>
    </div>
  );
};

export default Review;
