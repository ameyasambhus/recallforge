import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, Trash2, Calendar, Folder, Search, ArrowUpDown, X } from "lucide-react";

const ExpandableText = ({ text, limit = 150 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;

  if (text.length <= limit) {
    return <div>{text}</div>;
  }

  return (
    <div>
      <div>
        {isExpanded ? text : `${text.slice(0, limit)}...`}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="mt-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wide opacity-80 hover:opacity-100"
      >
        {isExpanded ? "Show Less" : "Read More"}
      </button>
    </div>
  );
};

const AllCards = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFolder, setSelectedFolder] = useState("All");
  const [availableFolders, setAvailableFolders] = useState(["All"]);
  const [totalCards, setTotalCards] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);

  const [selectedCard, setSelectedCard] = useState(null);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("dueDate");
  const [sortOrder, setSortOrder] = useState("asc");

  const fetchCards = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/card/cards", {
        params: {
          page,
          limit,
          folder: selectedFolder === "All" ? undefined : selectedFolder,
          search: searchTerm || undefined,
          sortBy,
          sortOrder
        }
      });
      
      // Handle pagination response
      setCards(data.cards || []);
      setTotalPages(data.totalPages || 1);
      setAvailableFolders(data.folders || ["All"]);
      setTotalCards(data.totalCards || 0);

      if (page > (data.totalPages || 1) && (data.totalPages || 0) > 0) {
        setPage(data.totalPages);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        toast.error(err.response?.data?.error || err.message);
      }
      setCards([]);
      setTotalPages(1);
      setTotalCards(0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCards();
  }, [page, selectedFolder, limit, searchTerm, sortBy, sortOrder]);

  const handleSearchClick = () => {
    setSearchTerm(searchInput);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchTerm("");
    setPage(1);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleDeleteClick = (e, card) => {
    e.stopPropagation();
    setCardToDelete(card);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`/api/card/${cardToDelete._id}/delete`);
      toast.success("Card deleted!");
      fetchCards();
      setShowDeleteModal(false);
      setCardToDelete(null);
      if (selectedCard?._id === cardToDelete._id) setSelectedCard(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setCardToDelete(null);
  };

  // Helper to get range string
  const getRangeString = () => {
    if (totalCards === 0) return "0-0 of 0";
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, totalCards);
    return `${start}-${end} of ${totalCards}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-2 md:p-6 relative">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Card Library</h1>
            <p className="text-gray-400 mt-1 text-sm">
              Manage your {totalCards} flashcards
              {searchTerm && <span className="ml-2 text-blue-400">• Searching: "{searchTerm}"</span>}
            </p>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2 bg-[#1e2329] p-2 rounded-xl border border-white/5 shadow-inner">
            <Folder className="w-4 h-4 text-gray-400 ml-2" />
            <select
              value={selectedFolder}
              onChange={(e) => { setSelectedFolder(e.target.value); setPage(1); }}
              className="bg-transparent text-sm text-gray-200 focus:outline-none p-1 min-w-[120px] md:min-w-[150px] cursor-pointer"
            >
              {availableFolders.map(f => (
                <option key={f} value={f} className="bg-[#1f262d] text-gray-300">
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search cards by question or answer..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className="w-full bg-[#1e2329] border border-white/5 rounded-xl pl-10 pr-24 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group"
                  title="Clear search"
                >
                  <X className="w-4 h-4 text-gray-400 group-hover:text-red-400 transition-colors" />
                </button>
              )}
              <button
                onClick={handleSearchClick}
                className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors group"
                title="Search"
              >
                <Search className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" />
              </button>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2 bg-[#1e2329] p-2 rounded-xl border border-white/5">
            <ArrowUpDown className="w-4 h-4 text-gray-400 ml-2" />
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="bg-transparent text-sm text-gray-200 focus:outline-none p-1 cursor-pointer"
            >
              <option value="dueDate" className="bg-[#1f262d] text-gray-300">Sort by Due Date</option>
              <option value="question" className="bg-[#1f262d] text-gray-300">Sort by Question</option>
              <option value="folder" className="bg-[#1f262d] text-gray-300">Sort by Folder</option>
              <option value="createdAt" className="bg-[#1f262d] text-gray-300">Sort by Created</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-2 py-1 text-xs font-medium text-gray-300 hover:text-white transition-colors"
              title={sortOrder === "asc" ? "Ascending" : "Descending"}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 text-gray-400 animate-pulse gap-2">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading cards...</span>
        </div>
      ) : (
        <div className="bg-[#1e2329] rounded-2xl border border-white/5 overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-[#272e36] text-xs uppercase font-semibold text-gray-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Question</th>
                  <th className="px-6 py-4 whitespace-nowrap">Folder</th>
                  <th className="px-6 py-4 whitespace-nowrap">Due Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {cards.map((card) => (
                  <tr
                    key={card._id}
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                    onClick={() => setSelectedCard(card)}
                  >
                    <td className="px-6 py-4 font-medium text-white max-w-[300px] md:max-w-[400px] truncate" title={card.question}>
                      {card.question}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 whitespace-nowrap">
                        {card.folder || "Uncategorized"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 opacity-60" />
                        {new Date(card.dueDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => handleDeleteClick(e, card)}
                        className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all opacity-60 group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
                {cards.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Folder className="w-8 h-8 opacity-20" />
                        <p>No cards found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 border-t border-white/5 bg-[#272e36]/50 gap-4">

            {/* Left side: Rows per page & showing text */}
            <div className="flex items-center gap-4 text-xs text-gray-400 w-full md:w-auto justify-between md:justify-start">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="bg-[#1f262d] border border-white/10 rounded p-1 text-gray-200 outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <span className="hidden md:inline">|</span>
              <span>Showing <span className="text-gray-200 font-medium">{getRangeString()}</span></span>
            </div>

            {/* Right side: Navigation */}
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {totalPages > 1 && (
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(page - p) <= 1)
                    .map((p, i, arr) => {
                      const isGap = i > 0 && p - arr[i - 1] > 1;
                      return (
                        <React.Fragment key={p}>
                          {isGap && <span className="w-8 h-8 flex items-center justify-center text-gray-600">...</span>}
                          <button
                            onClick={() => setPage(p)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${page === p
                              ? "bg-indigo-600 text-white"
                              : "text-gray-400 hover:bg-white/5 hover:text-white"
                              }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })
                  }
                </div>
              )}

              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Details Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-[#1e2329] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold text-white">Card Details</h2>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-sm uppercase text-gray-500 font-semibold tracking-wider">Question</h3>
                  <div className="p-4 rounded-xl bg-[#272e36] border border-white/5 text-lg text-white font-medium">
                    <ExpandableText text={selectedCard.question} limit={150} />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm uppercase text-gray-500 font-semibold tracking-wider">Answer</h3>
                  <div className="p-4 rounded-xl bg-[#272e36] border border-white/5 text-gray-300 leading-relaxed whitespace-pre-wrap">
                    <ExpandableText text={selectedCard.answer} limit={400} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-[#272e36]/50 border border-white/5">
                    <span className="text-xs text-gray-500 block mb-1">Folder</span>
                    <span className="text-blue-400 font-medium">{selectedCard.folder || "Uncategorized"}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#272e36]/50 border border-white/5">
                    <span className="text-xs text-gray-500 block mb-1">Due Date</span>
                    <span className="text-gray-300">{new Date(selectedCard.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && cardToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={handleCancelDelete}
        >
          <div
            className="bg-[#1e2329] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
              <h3 className="text-xl font-bold text-white">Delete Card</h3>
            </div>
            <p className="text-gray-300 mb-2">
              Are you sure you want to delete this card?
            </p>
            <div className="p-3 rounded-lg bg-[#272e36] border border-white/5 mb-6">
              <p className="text-sm text-gray-400 mb-1">Question:</p>
              <p className="text-white font-medium line-clamp-2">{cardToDelete.question}</p>
            </div>
            <p className="text-red-400 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg bg-[#272e36] text-gray-300 hover:bg-[#2a3441] transition-colors border border-white/5"
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center gap-2 font-medium"
                onClick={handleConfirmDelete}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllCards;
