import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, Trash2, Calendar, Folder, Search, ArrowUpDown, X, Edit2, ListPlus, Upload, FileText, PlayCircle, Image as ImageIcon, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MDEditor from "@uiw/react-md-editor";
import CardMediaPreview from "./CardMediaPreview";

const ExpandableText = ({ text, limit = 150, isMarkdown = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;

  const content = isExpanded || text.length <= limit ? text : `${text.slice(0, limit)}...`;

  return (
    <div>
      <div className={isMarkdown ? "w-full max-w-none" : ""} data-color-mode="dark">
        {isMarkdown ? (
          <MDEditor.Markdown source={content} style={{ backgroundColor: 'transparent', fontSize: '0.875rem' }} />
        ) : (
          content
        )}
      </div>
      {text.length > limit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="mt-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wide opacity-80 hover:opacity-100"
        >
          {isExpanded ? "Show Less" : "Read More"}
        </button>
      )}
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

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [editForm, setEditForm] = useState({ question: "", answer: "", folder: "" });
  const [editMedia, setEditMedia] = useState([]);
  const [editNewFiles, setEditNewFiles] = useState([]);
  const [editMediaLoading, setEditMediaLoading] = useState(false);
  const [editMediaBusy, setEditMediaBusy] = useState(false);
  const [editUploadProgress, setEditUploadProgress] = useState(0);
  const [editNewFilePreviews, setEditNewFilePreviews] = useState([]);

  // Add to List State
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [cardToAddToList, setCardToAddToList] = useState(null);
  const [userLists, setUserLists] = useState([]);

  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedCardMedia, setSelectedCardMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(null);
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

  useEffect(() => {
    const fetchCardMedia = async () => {
      if (!selectedCard?._id) {
        setSelectedCardMedia([]);
        setActiveMediaIndex(null);
        return;
      }

      setMediaLoading(true);
      try {
        const { data } = await axios.get(`/api/card/${selectedCard._id}/media`);
        setSelectedCardMedia(data.media || []);
      } catch (err) {
        setSelectedCardMedia([]);
      } finally {
        setMediaLoading(false);
      }
    };

    fetchCardMedia();
  }, [selectedCard?._id]);

  const closeMediaViewer = () => setActiveMediaIndex(null);

  const showNextMedia = () => {
    if (!selectedCardMedia.length) return;
    setActiveMediaIndex((prev) => {
      if (prev === null) return 0;
      return (prev + 1) % selectedCardMedia.length;
    });
  };

  const showPreviousMedia = () => {
    if (!selectedCardMedia.length) return;
    setActiveMediaIndex((prev) => {
      if (prev === null) return 0;
      return (prev - 1 + selectedCardMedia.length) % selectedCardMedia.length;
    });
  };

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

  const handleEditClick = (e, card) => {
    e.stopPropagation();
    setEditingCard(card);
    setEditForm({
      question: card.question,
      answer: card.answer,
      folder: card.folder || ""
    });
    setEditNewFiles([]);
    setShowEditModal(true);
  };

  useEffect(() => {
    const fetchEditMedia = async () => {
      if (!showEditModal || !editingCard?._id) {
        setEditMedia([]);
        return;
      }
      setEditMediaLoading(true);
      try {
        const { data } = await axios.get(`/api/card/${editingCard._id}/media`);
        setEditMedia(data.media || []);
      } catch (err) {
        setEditMedia([]);
      } finally {
        setEditMediaLoading(false);
      }
    };

    fetchEditMedia();
  }, [showEditModal, editingCard?._id]);

  const handleEditFileSelection = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    const isValidFile = (file) => {
      const validType =
        file.type.startsWith("image/") ||
        file.type.startsWith("video/") ||
        file.type === "application/pdf";
      return validType && file.size <= 2 * 1024 * 1024;
    };

    const invalidFile = selectedFiles.find((file) => !isValidFile(file));
    if (invalidFile) {
      toast.error("Only image/video/PDF files up to 2 MB are allowed");
      event.target.value = "";
      return;
    }

    const maxAllowed = 3 - editMedia.length;
    if (maxAllowed <= 0) {
      toast.error("A card can have maximum 3 files");
      event.target.value = "";
      return;
    }

    setEditNewFiles((prev) => {
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
      if (merged.length > maxAllowed) {
        toast.error(`You can add only ${maxAllowed} more file(s)`);
      }
      return merged.slice(0, maxAllowed);
    });
    event.target.value = "";
  };

  useEffect(() => {
    const previews = editNewFiles.map((file) => ({
      key: `${file.name}-${file.lastModified}-${file.size}`,
      file,
      previewUrl: file.type === "application/pdf" ? null : URL.createObjectURL(file),
    }));
    setEditNewFilePreviews(previews);

    return () => {
      previews.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [editNewFiles]);

  const handleDeleteMedia = async (mediaId) => {
    if (!editingCard?._id || editMediaBusy) return;
    try {
      setEditMediaBusy(true);
      await axios.delete(`/api/card/${editingCard._id}/media/${mediaId}`);
      setEditMedia((prev) => prev.filter((item) => item.id !== mediaId));
      toast.success("Attachment deleted");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete attachment");
    } finally {
      setEditMediaBusy(false);
    }
  };

  const handleUploadEditMedia = async () => {
    if (!editingCard?._id || !editNewFiles.length || editMediaBusy) return;
    try {
      setEditMediaBusy(true);
      setEditUploadProgress(0);
      const formData = new FormData();
      editNewFiles.forEach((file) => formData.append("media", file));
      const { data } = await axios.post(`/api/card/${editingCard._id}/media`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || 0;
          if (!total) return;
          const percent = Math.round((progressEvent.loaded * 100) / total);
          setEditUploadProgress(Math.max(1, Math.min(percent, 100)));
        },
      });
      setEditMedia((prev) => [...prev, ...(data.media || [])]);
      setEditNewFiles([]);
      setEditNewFilePreviews([]);
      setEditUploadProgress(0);
      toast.success("Attachments uploaded");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to upload attachments");
    } finally {
      setEditMediaBusy(false);
    }
  };

  const handleDownloadMedia = async (item) => {
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
    } catch (err) {
      toast.error("Failed to download attachment");
    }
  };

  const handleUpdateCard = async () => {
    try {
      if (!editForm.question || !editForm.answer) {
        toast.error("Question and Answer are required");
        return;
      }

      const res = await axios.put(`/api/card/${editingCard._id}/update`, editForm);

      toast.success("Card updated successfully!");
      setShowEditModal(false);
      setEditingCard(null);
      fetchCards();

      // Update selected card viewing if applicable
      if (selectedCard?._id === editingCard._id) {
        setSelectedCard(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update card");
    }
  };

  const handleAddToListClick = async (e, card) => {
    e.stopPropagation();
    setCardToAddToList(card);
    setShowAddToListModal(true);
    
    try {
      const { data } = await axios.get("/api/lists");
      if (data.success) {
        setUserLists(data.lists.filter(l => l.my_role === 'owner' || l.my_role === 'editor'));
      }
    } catch (err) {
      toast.error("Failed to fetch lists");
    }
  };

  const handleConfirmAddToList = async (listId) => {
    try {
      await axios.post(`/api/lists/${listId}/cards`, { cardId: cardToAddToList._id });
      toast.success("Card added to list!");
      setShowAddToListModal(false);
      setCardToAddToList(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add card to list");
    }
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => handleAddToListClick(e, card)}
                          className="p-2 hover:bg-green-500/10 hover:text-green-400 rounded-lg transition-all opacity-60 group-hover:opacity-100"
                          title="Add to List"
                        >
                          <ListPlus className="w-4 h-4 text-green-500" />
                        </button>
                        <button
                          onClick={(e) => handleEditClick(e, card)}
                          className="p-2 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg transition-all opacity-60 group-hover:opacity-100"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(e, card)}
                          className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all opacity-60 group-hover:opacity-100"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
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
          onClick={() => {
            setSelectedCard(null);
            setActiveMediaIndex(null);
          }}
        >
          <div
            className="bg-[#1e2329] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold text-white">Card Details</h2>
                <button
                  onClick={() => {
                    setSelectedCard(null);
                    setActiveMediaIndex(null);
                  }}
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
                  <div data-color-mode="dark" className="rounded-xl overflow-hidden border border-white/5 shadow-inner">
                    <MDEditor
                      value={selectedCard.answer}
                      preview="preview"
                      hideToolbar={true}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm uppercase text-gray-500 font-semibold tracking-wider">Media</h3>
                  {mediaLoading ? (
                    <p className="text-sm text-gray-400">Loading attachments...</p>
                  ) : selectedCardMedia.length ? (
                    <CardMediaPreview media={selectedCardMedia} onMediaClick={setActiveMediaIndex} />
                  ) : (
                    <p className="text-sm text-gray-500">No attachments</p>
                  )}
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

          {activeMediaIndex !== null && selectedCardMedia[activeMediaIndex] && (
            <div
              className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
              onClick={closeMediaViewer}
            >
              <div
                className="w-full max-w-5xl rounded-2xl border border-white/10 bg-[#11161c] p-4 sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-end mb-3">
                  <button
                    type="button"
                    onClick={closeMediaViewer}
                    className="rounded-md px-3 py-1.5 text-sm text-gray-200 bg-white/10 hover:bg-white/20"
                  >
                    Close
                  </button>
                </div>

                <div className="w-full min-h-[280px] max-h-[70vh] flex items-center justify-center bg-black rounded-lg overflow-hidden">
                  {selectedCardMedia[activeMediaIndex].media_type === "image" && (
                    <img
                      src={selectedCardMedia[activeMediaIndex].url}
                      alt={selectedCardMedia[activeMediaIndex].file_name || "attachment"}
                      className="max-w-full max-h-[70vh] object-contain"
                    />
                  )}

                  {selectedCardMedia[activeMediaIndex].media_type === "video" && (
                    <video
                      src={selectedCardMedia[activeMediaIndex].url}
                      controls
                      autoPlay
                      className="max-w-full max-h-[70vh]"
                    />
                  )}

                  {selectedCardMedia[activeMediaIndex].media_type === "file" && (
                    <iframe
                      src={selectedCardMedia[activeMediaIndex].url}
                      title={selectedCardMedia[activeMediaIndex].file_name || "PDF preview"}
                      className="w-full h-[70vh] bg-white"
                    />
                  )}
                </div>

                <div className="mt-4 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={showPreviousMedia}
                    className="rounded-full p-2 bg-white/10 text-white hover:bg-white/20"
                    aria-label="Previous media"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-300">
                    {activeMediaIndex + 1} / {selectedCardMedia.length}
                  </span>
                  <button
                    type="button"
                    onClick={showNextMedia}
                    className="rounded-full p-2 bg-white/10 text-white hover:bg-white/20"
                    aria-label="Next media"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Card Modal */}
      {showEditModal && editingCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-[#1e2329] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold text-white">Edit Card</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Question</label>
                  <textarea
                    value={editForm.question}
                    onChange={(e) => setEditForm(prev => ({ ...prev, question: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#272e36] p-3 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 outline-none transition-all"
                    rows={3}
                  />
                </div>

                <div className="space-y-2" data-color-mode="dark">
                  <label className="text-sm text-gray-400">Answer (Markdown supported)</label>
                  <div className="rounded-xl overflow-hidden border border-white/5 shadow-inner">
                    <MDEditor
                      value={editForm.answer}
                      onChange={(val) => setEditForm(prev => ({ ...prev, answer: val || '' }))}
                      preview="edit"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Folder</label>
                  <input
                    type="text"
                    list="folderList"
                    value={editForm.folder}
                    onChange={(e) => setEditForm(prev => ({ ...prev, folder: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#272e36] p-3 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 outline-none transition-all"
                  />
                  <datalist id="folderList">
                    {availableFolders.filter(f => f !== "All").map(f => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-3 rounded-xl border border-white/10 bg-[#272e36] p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-300">Attachments ({editMedia.length}/3)</label>
                  </div>

                  {editMediaLoading ? (
                    <p className="text-xs text-gray-400">Loading attachments...</p>
                  ) : editMedia.length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {editMedia.map((item) => (
                        <div key={item.id} className="relative rounded-lg overflow-hidden border border-white/10 bg-[#1f262d]">
                          {item.media_type === "image" && (
                            <img src={item.url} alt={item.file_name || "attachment"} className="w-full h-28 object-cover" />
                          )}
                          {item.media_type === "video" && (
                            <div className="relative">
                              <video src={item.url} className="w-full h-28 object-cover pointer-events-none" />
                              <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                                <PlayCircle className="w-8 h-8 text-white" />
                              </div>
                            </div>
                          )}
                          {item.media_type === "file" && (
                            <div className="h-28 flex items-center justify-center gap-2 text-indigo-300 bg-[#202733]">
                              <FileText className="w-5 h-5" />
                              <span className="text-sm">PDF</span>
                            </div>
                          )}
                          <div className="px-2 py-1.5 text-xs text-gray-300 truncate">{item.file_name || "Attachment"}</div>
                          <div className="absolute top-2 right-2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDownloadMedia(item)}
                              className="p-1.5 rounded-md text-indigo-200 bg-black/40 hover:bg-indigo-500/30"
                              title="Download attachment"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={editMediaBusy}
                              onClick={() => handleDeleteMedia(item.id)}
                              className="p-1.5 rounded-md text-red-300 bg-black/40 hover:bg-red-500/30 disabled:opacity-50"
                              title="Delete attachment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No attachments</p>
                  )}

                  <div className="space-y-2">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,application/pdf"
                      onChange={handleEditFileSelection}
                      disabled={editMedia.length >= 3 || editMediaBusy}
                      className="block w-full text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-500 disabled:opacity-50"
                    />
                    {!!editNewFilePreviews.length && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {editNewFilePreviews.map(({ key, file, previewUrl }) => (
                          <div key={key} className="rounded-md border border-white/10 bg-[#1f262d] overflow-hidden">
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
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleUploadEditMedia}
                      disabled={!editNewFiles.length || editMediaBusy}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      {editMediaBusy ? "Uploading..." : "Upload Selected Files"}
                    </button>
                    {editMediaBusy && editUploadProgress > 0 && (
                      <div className="rounded-lg border border-indigo-500/30 bg-indigo-600/10 p-2.5">
                        <div className="flex justify-between text-xs text-indigo-200 mb-1">
                          <span>Uploading attachments...</span>
                          <span>{editUploadProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#1f262d] overflow-hidden">
                          <div className="h-full bg-indigo-500 transition-all duration-200" style={{ width: `${editUploadProgress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 justify-end mt-6">
                  <button
                    className="px-4 py-2 rounded-lg bg-[#272e36] text-gray-300 hover:bg-[#2a3441] transition-colors border border-white/5"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors font-medium shadow-lg shadow-indigo-500/20"
                    onClick={handleUpdateCard}
                  >
                    Save Changes
                  </button>
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

      {/* Add to List Modal */}
      {showAddToListModal && cardToAddToList && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setShowAddToListModal(false)}
        >
          <div
            className="bg-[#1e2329] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2">
                <ListPlus className="text-indigo-400" size={20} />
                <h2 className="text-xl font-bold text-white">Add to List</h2>
              </div>
              <button
                onClick={() => setShowAddToListModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-3 rounded-lg bg-[#272e36] border border-white/5 mb-6">
              <p className="text-white font-medium line-clamp-2">{cardToAddToList.question}</p>
            </div>

            <h3 className="text-sm uppercase text-gray-500 font-semibold tracking-wider mb-3">Your Lists</h3>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {userLists.length === 0 ? (
                <div className="text-center text-gray-500 py-6">
                  <p>No lists available.</p>
                  <p className="text-xs mt-1">Create a list first in the Lists tab.</p>
                </div>
              ) : (
                userLists.map(list => (
                  <button
                    key={list.id}
                    onClick={() => handleConfirmAddToList(list.id)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-[#272e36]/50 hover:bg-[#272e36] border border-white/5 hover:border-indigo-500/30 transition-all text-left group"
                  >
                    <div>
                      <p className="text-white font-medium text-sm">{list.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{list.card_count} cards</p>
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Add
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllCards;
