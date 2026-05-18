import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Calendar, Trash2, BookOpen, Lock, Users, Globe, Folder, Shield, Pencil, Eye, LayoutList, Copy, Share2 } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import { ShareModal } from "./Lists";

const VisibilityBadge = ({ visibility }) => {
  const map = {
    private: { icon: Lock, label: "Private", cls: "bg-neutral-700 text-neutral-300" },
    shared:  { icon: Users, label: "Shared",  cls: "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30" },
    public:  { icon: Globe, label: "Public",  cls: "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30" },
  };
  const { icon: Icon, label, cls } = map[visibility] ?? map.private;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <Icon size={10} /> {label}
    </span>
  );
};

const RoleBadge = ({ role }) => {
  if (role === "owner") return <span className="text-xs text-amber-400 font-semibold flex items-center gap-1"><Shield size={11}/>Owner</span>;
  if (role === "editor") return <span className="text-xs text-sky-400 font-semibold flex items-center gap-1"><Pencil size={11}/>Editor</span>;
  return <span className="text-xs text-neutral-400 flex items-center gap-1"><Eye size={11}/>Viewer</span>;
};

const ExpandableText = ({ text, limit = 150 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!text) return null;
  const content = isExpanded || text.length <= limit ? text : `${text.slice(0, limit)}...`;
  return (
    <div>
      <div>{content}</div>
      {text.length > limit && (
        <button
          onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
          className="mt-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wide opacity-80 hover:opacity-100"
        >
          {isExpanded ? "Show Less" : "Read More"}
        </button>
      )}
    </div>
  );
};

const ListView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [listRes, cardsRes] = await Promise.all([
        axios.get(`/api/lists/${id}`),
        axios.get(`/api/lists/${id}/cards`)
      ]);
      setList(listRes.data.list);
      setCards(cardsRes.data.cards || []);
    } catch (err) {
      toast.error(err.response?.data?.error || "You don't have access to this list.");
      navigate("/app/lists");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleRemoveCard = async (e, cardId) => {
    e.stopPropagation();
    try {
      await axios.delete(`/api/lists/${id}/cards/${cardId}`);
      toast.success("Card removed from list");
      setCards(prev => prev.filter(c => c.card_id !== cardId));
    } catch (err) {
      toast.error("Failed to remove card");
    }
  };

  const handleCopyCard = async (e, cardId) => {
    e.stopPropagation();
    try {
      const res = await axios.post(`/api/lists/${id}/cards/${cardId}/copy`);
      if (res.data.success) {
        toast.success(res.data.message);
      }
    } catch (err) {
      toast.error("Failed to copy card");
    }
  };

  const canEdit = list?.my_role === "owner" || list?.my_role === "editor";

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-400 animate-pulse w-full">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!list) return null;

  return (
    <div className="w-full max-w-7xl mx-auto p-2 md:p-6 flex flex-col lg:flex-row gap-6">
      
      {/* Left Pane - List Details */}
      <div className="w-full lg:w-1/3 xl:w-1/4 shrink-0">
        <div className="bg-[#1e2329] border border-white/5 rounded-2xl p-6 sticky top-24">
          <button 
            onClick={() => navigate("/app/lists")}
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={16} /> Back to Lists
          </button>
          
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center mb-4">
            <LayoutList size={24} className="text-indigo-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">{list.title}</h1>
          
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <VisibilityBadge visibility={list.visibility} />
            <RoleBadge role={list.my_role} />
          </div>
          
          {list.my_role === "owner" && (
            <button
              onClick={() => setShowShareModal(true)}
              className="w-full mb-6 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Share2 size={16} /> Share List
            </button>
          )}

          {list.visibility === "public" && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/app/lists/${list.id}`);
                toast.success("Public link copied!");
              }}
              className="w-full mb-6 py-2 px-4 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-sm font-medium border border-indigo-500/20 transition-colors flex items-center justify-center gap-2"
            >
              <Globe size={14} /> Copy Public Link
            </button>
          )}

          {list.description && (
            <p className="text-neutral-400 text-sm mb-6">{list.description}</p>
          )}
          
          <div className="space-y-3 pt-4 border-t border-white/5 text-sm">
            <div className="flex justify-between items-center text-neutral-300">
              <span className="text-neutral-500">Owner</span>
              <span>{list.my_role === "owner" ? "You" : list.owner_name}</span>
            </div>
            <div className="flex justify-between items-center text-neutral-300">
              <span className="text-neutral-500">Cards</span>
              <span>{cards.length}</span>
            </div>
            <div className="flex justify-between items-center text-neutral-300">
              <span className="text-neutral-500">Updated</span>
              <span>{new Date(list.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane - Cards Table */}
      <div className="w-full lg:flex-1">
        <div className="bg-[#1e2329] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Cards in List</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-[#272e36] text-xs uppercase font-semibold text-gray-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Question</th>
                  <th className="px-6 py-4 whitespace-nowrap">Folder</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {cards.map((card) => (
                  <tr
                    key={card.card_id}
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
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => handleCopyCard(e, card.card_id)}
                          className="p-2 hover:bg-green-500/10 hover:text-green-400 rounded-lg transition-all opacity-60 group-hover:opacity-100"
                          title="Copy to my account"
                        >
                          <Copy className="w-4 h-4 text-green-500" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={(e) => handleRemoveCard(e, card.card_id)}
                            className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all opacity-60 group-hover:opacity-100"
                            title="Remove from list"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {cards.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <BookOpen className="w-8 h-8 opacity-20" />
                        <p>No cards in this list yet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
                  <div data-color-mode="dark" className="rounded-xl overflow-hidden border border-white/5 shadow-inner">
                    <MDEditor
                      value={selectedCard.answer}
                      preview="preview"
                      hideToolbar={true}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="p-3 rounded-lg bg-[#272e36]/50 border border-white/5">
                    <span className="text-xs text-gray-500 block mb-1">Folder</span>
                    <span className="text-blue-400 font-medium">{selectedCard.folder || "Uncategorized"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <ShareModal 
          list={list} 
          onClose={() => setShowShareModal(false)} 
          onListUpdated={fetchData} 
        />
      )}
    </div>
  );
};

export default ListView;
