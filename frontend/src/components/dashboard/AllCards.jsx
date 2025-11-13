import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { AppContent } from "../../context/AppContext";
import Card from "./Card";

const AllCards = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState("All");

  const fetchCards = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/card/cards");
      setCards(data);
    } catch (err) {
      if (err.response.status === 429) {
        toast.error("Too many requests. Please try after some time");
      } else {
        toast.error(err.message);
      }
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/card/${id}/delete`);
      toast.success("Card deleted!");
      setCards((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const folders = [
    "All",
    ...new Set(cards.map((c) => c.folder || "Uncategorized")),
  ];

  const filteredCards =
    selectedFolder === "All"
      ? cards
      : cards.filter((c) => (c.folder || "Uncategorized") === selectedFolder);

  if (loading)
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#272e36] p-8 shadow-lg">
        <div>Loading...</div>
      </div>
    );

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#272e36] p-8 shadow-lg">
      <h1 className="text-2xl font-bold mb-4">All Cards</h1>
      <div className="mb-4">
        <select
          value={selectedFolder}
          onChange={(e) => setSelectedFolder(e.target.value)}
          className="p-2 rounded bg-[#1f262d] text-white border border-gray-600"
        >
          {folders.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.length === 0 ? (
        <div>No cards found!</div>
      ) : (
        filteredCards.map((card) => (
          <Card key={card._id} card={card} onDelete={handleDelete} />
        ))
      )}
      </div>
    </div>
  );
};

export default AllCards;
