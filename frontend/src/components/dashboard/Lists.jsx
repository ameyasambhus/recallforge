import React, { useEffect, useState, useContext } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
  List,
  Plus,
  Trash2,
  Edit2,
  Globe,
  Lock,
  Users,
  Eye,
  Pencil,
  X,
  ChevronRight,
  BookOpen,
  UserPlus,
  Shield,
  LogOut,
} from "lucide-react";
import { AppContent } from "../../context/AppContext";

// ── Visibility badge ─────────────────────────────────────────────────────────
const VisibilityBadge = ({ visibility }) => {
  const map = {
    private: {
      icon: Lock,
      label: "Private",
      cls: "bg-neutral-700 text-neutral-300",
    },
    shared: {
      icon: Users,
      label: "Shared",
      cls: "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30",
    },
    public: {
      icon: Globe,
      label: "Public",
      cls: "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30",
    },
  };
  const { icon: Icon, label, cls } = map[visibility] ?? map.private;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      <Icon size={10} /> {label}
    </span>
  );
};

const RoleBadge = ({ role }) => {
  if (role === "owner")
    return (
      <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
        <Shield size={11} />
        Owner
      </span>
    );
  if (role === "editor")
    return (
      <span className="text-xs text-sky-400 font-semibold flex items-center gap-1">
        <Pencil size={11} />
        Editor
      </span>
    );
  return (
    <span className="text-xs text-neutral-400 flex items-center gap-1">
      <Eye size={11} />
      Viewer
    </span>
  );
};

const ModalPortal = ({ children }) => createPortal(children, document.body);

// ── Share Modal ───────────────────────────────────────────────────────────────
export const ShareModal = ({ list, onClose, onListUpdated }) => {
  const [permissions, setPermissions] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [loading, setLoading] = useState(false);
  const [vis, setVis] = useState(list.visibility);

  useEffect(() => {
    axios
      .get(`/api/lists/${list.id}/permissions`)
      .then((r) => setPermissions(r.data.permissions ?? []))
      .catch(() => {});
  }, [list.id]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setLoading(true);
    try {
      const r = await axios.post(`/api/lists/${list.id}/permissions`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      if (r.data.success) {
        toast.success(r.data.message);
        setInviteEmail("");
        const perms = await axios.get(`/api/lists/${list.id}/permissions`);
        setPermissions(perms.data.permissions ?? []);
        onListUpdated();
      }
    } catch (err) {
      toast.error(err.response?.data?.error ?? "Failed to invite");
    }
    setLoading(false);
  };

  const handleRemove = async (userId) => {
    try {
      await axios.delete(`/api/lists/${list.id}/permissions/${userId}`);
      setPermissions((prev) => prev.filter((p) => p.user_id !== userId));
      toast.success("Removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`/api/lists/${list.id}/permissions/${userId}`, {
        role: newRole,
      });
      setPermissions((prev) =>
        prev.map((p) => (p.user_id === userId ? { ...p, role: newRole } : p)),
      );
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleVisChange = async (newVis) => {
    try {
      await axios.put(`/api/lists/${list.id}`, { visibility: newVis });
      setVis(newVis);
      onListUpdated();
    } catch {
      toast.error("Failed to update visibility");
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-[#1e2329] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users size={18} className="text-indigo-400" />
              Share "{list.title}"
            </h2>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Visibility */}
          <div>
            <p className="text-xs text-neutral-400 mb-2 font-semibold uppercase tracking-wider">
              Visibility
            </p>
            <div className="flex gap-2">
              {["private", "shared", "public"].map((v) => (
                <button
                  key={v}
                  onClick={() => handleVisChange(v)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${vis === v ? "bg-indigo-600 border-indigo-500 text-white" : "bg-[#272e36] border-white/5 text-neutral-400 hover:border-white/20"}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              {vis === "private" && "Only you can see this list."}
              {vis === "shared" && "Only invited people can see this list."}
              {vis === "public" && "Anyone with the link can see this list."}
            </p>
          </div>

          {/* Copy Link */}
          {vis === "public" && (
            <div className="bg-[#272e36]/50 p-4 rounded-xl border border-white/5">
              <p className="text-xs text-neutral-400 mb-2 font-semibold uppercase tracking-wider">
                Public Link
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={`${window.location.origin}/app/lists/${list.id}`}
                  className="flex-1 rounded-lg border border-white/10 bg-[#1e2329] px-3 py-2 text-sm text-neutral-400 outline-none select-all"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/app/lists/${list.id}`,
                    );
                    toast.success("Link copied!");
                  }}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* Invite */}
          <div>
            <p className="text-xs text-neutral-400 mb-2 font-semibold uppercase tracking-wider">
              Invite People
            </p>
            <div className="flex gap-2">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                placeholder="Email address..."
                className="flex-1 rounded-xl border border-white/10 bg-[#272e36] px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-indigo-500 outline-none"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#272e36] px-3 py-2 text-sm text-white outline-none"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button
                onClick={handleInvite}
                disabled={loading}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
              >
                <UserPlus size={16} />
              </button>
            </div>
          </div>

          {/* Existing permissions */}
          {permissions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                People with access
              </p>
              {permissions.map((p) => (
                <div
                  key={p.user_id}
                  className="flex items-center justify-between bg-[#272e36] rounded-xl px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-white font-medium">
                      {p.user_name}
                    </p>
                    <p className="text-xs text-neutral-500">{p.user_email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={p.role}
                      onChange={(e) =>
                        handleRoleChange(p.user_id, e.target.value)
                      }
                      className="rounded-lg border border-white/10 bg-[#1e2329] px-2 py-1 text-xs text-white outline-none"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      onClick={() => handleRemove(p.user_id)}
                      className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};

// ── Cards Modal ───────────────────────────────────────────────────────────────
const CardsModal = ({ list, canEdit, onClose }) => {
  const [listCards, setListCards] = useState([]);
  const [myCards, setMyCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("view");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lc, mc] = await Promise.all([
          axios.get(`/api/lists/${list.id}/cards`),
          canEdit
            ? axios.get("/api/card/cards", { params: { limit: 200 } })
            : Promise.resolve({ data: { cards: [] } }),
        ]);
        setListCards(lc.data.cards ?? []);
        setMyCards(mc.data.cards ?? []);
      } catch {
        toast.error("Failed to load cards");
      }
      setLoading(false);
    };
    fetchData();
  }, [list.id]);

  const listCardIds = new Set(listCards.map((c) => c.card_id));

  const handleAdd = async (cardId) => {
    try {
      await axios.post(`/api/lists/${list.id}/cards`, { cardId });
      const r = await axios.get(`/api/lists/${list.id}/cards`);
      setListCards(r.data.cards ?? []);
      toast.success("Card added");
    } catch (err) {
      toast.error(err.response?.data?.error ?? "Failed");
    }
  };

  const handleRemove = async (cardId) => {
    try {
      await axios.delete(`/api/lists/${list.id}/cards/${cardId}`);
      setListCards((prev) => prev.filter((c) => c.card_id !== cardId));
      toast.success("Card removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-[#1e2329] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-5 border-b border-white/5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-400" />
              {list.title}
            </h2>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {canEdit && (
            <div className="flex gap-1 p-3 border-b border-white/5 bg-[#171b20]">
              {["view", "add"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? "bg-indigo-600 text-white" : "text-neutral-400 hover:text-white"}`}
                >
                  {t === "view" ? "Cards in list" : "Add cards"}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tab === "view" ? (
              listCards.length === 0 ? (
                <div className="text-center text-neutral-500 py-12">
                  <BookOpen size={32} className="mx-auto mb-2 opacity-20" />
                  <p>No cards in this list yet.</p>
                </div>
              ) : (
                listCards.map((c) => (
                  <div
                    key={c.card_id}
                    className="bg-[#272e36] rounded-xl p-3 flex items-start justify-between gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium line-clamp-2">
                        {c.question}
                      </p>
                      {c.folder && (
                        <span className="text-xs text-neutral-500 mt-0.5 block">
                          {c.folder}
                        </span>
                      )}
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleRemove(c.card_id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-red-400 transition-all shrink-0"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))
              )
            ) : (
              myCards
                .filter((c) => !listCardIds.has(c._id ?? c.id))
                .map((c) => (
                  <div
                    key={c._id ?? c.id}
                    className="bg-[#272e36] rounded-xl p-3 flex items-start justify-between gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium line-clamp-2">
                        {c.question}
                      </p>
                      {c.folder && (
                        <span className="text-xs text-neutral-500 mt-0.5 block">
                          {c.folder}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleAdd(c._id ?? c.id)}
                      className="shrink-0 px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white text-xs font-medium transition-all border border-indigo-500/30"
                    >
                      Add
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

// ── Create/Edit Modal ─────────────────────────────────────────────────────────
const ListFormModal = ({ existing, onClose, onSave }) => {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [visibility, setVisibility] = useState(
    existing?.visibility ?? "private",
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        const r = await axios.put(`/api/lists/${existing.id}`, {
          title,
          description,
          visibility,
        });
        if (r.data.success) {
          toast.success("List updated!");
          onSave();
        }
      } else {
        const r = await axios.post("/api/lists", {
          title,
          description,
          visibility,
        });
        if (r.data.success) {
          toast.success("List created!");
          onSave();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error ?? "Failed");
    }
    setSaving(false);
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-[#1e2329] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">
              {existing ? "Edit List" : "New List"}
            </h2>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">
                Title *
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="e.g. UPSC Revision List"
                className="w-full rounded-xl border border-white/10 bg-[#272e36] px-3 py-2.5 text-white placeholder-neutral-500 focus:border-indigo-500 outline-none text-sm"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Optional description..."
                className="w-full rounded-xl border border-white/10 bg-[#272e36] px-3 py-2.5 text-white placeholder-neutral-500 focus:border-indigo-500 outline-none text-sm resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">
                Visibility
              </label>
              <div className="flex gap-2">
                {["private", "shared", "public"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setVisibility(v)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${visibility === v ? "bg-indigo-600 border-indigo-500 text-white" : "bg-[#272e36] border-white/5 text-neutral-400 hover:border-white/20"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#272e36] text-neutral-300 hover:bg-[#2a3441] text-sm border border-white/5"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {saving ? "Saving…" : existing ? "Save Changes" : "Create List"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

// ── Main Lists Page ───────────────────────────────────────────────────────────
const Lists = () => {
  const { userData } = useContext(AppContent);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [shareList, setShareList] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchLists = async () => {
    setLoading(true);
    try {
      const r = await axios.get("/api/lists");
      setLists(r.data.lists ?? []);
    } catch {
      toast.error("Failed to load lists");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/lists/${deleteTarget.id}`);
      toast.success("List deleted");
      setDeleteTarget(null);
      fetchLists();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const myLists = lists.filter((l) => l.my_role === "owner");
  const sharedWithMe = lists.filter((l) => l.my_role !== "owner");

  return (
    <div className="w-full max-w-4xl mx-auto p-2 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Lists</h1>
          <p className="text-neutral-400 mt-1 text-sm">
            Organise cards into shareable study lists
          </p>
        </div>
        <button
          onClick={() => {
            setEditingList(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-500/20 transition-all shrink-0"
        >
          <Plus size={16} /> New List
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 text-neutral-400 gap-2">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* My Lists */}
          <section>
            <h2 className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-3">
              My Lists ({myLists.length})
            </h2>
            {myLists.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-neutral-600">
                <List size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  No lists yet. Create one to get started.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {myLists.map((l) => (
                  <ListCard
                    key={l.id}
                    list={l}
                    isOwner
                    onEdit={() => {
                      setEditingList(l);
                      setShowForm(true);
                    }}
                    onShare={() => setShareList(l)}
                    onDelete={() => setDeleteTarget(l)}
                    onOpen={() => navigate(`/app/lists/${l.id}`)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Shared with me */}
          {sharedWithMe.length > 0 && (
            <section>
              <h2 className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-3">
                Shared with me ({sharedWithMe.length})
              </h2>
              <div className="grid gap-3">
                {sharedWithMe.map((l) => (
                  <ListCard
                    key={l.id}
                    list={l}
                    onOpen={() => navigate(`/app/lists/${l.id}`)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Modals */}
      {showForm && (
        <ListFormModal
          existing={editingList}
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            fetchLists();
          }}
        />
      )}
      {shareList && (
        <ShareModal
          list={shareList}
          onClose={() => setShareList(null)}
          onListUpdated={fetchLists}
        />
      )}
      {deleteTarget && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <div
              className="bg-[#1e2329] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <Trash2 size={20} className="text-red-500" />
                <h3 className="text-lg font-bold text-white">Delete List</h3>
              </div>
              <p className="text-neutral-300 text-sm">
                Delete{" "}
                <span className="font-semibold text-white">
                  "{deleteTarget.title}"
                </span>
                ? Cards won't be deleted.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl bg-[#272e36] text-neutral-300 text-sm border border-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

// ── List Card Row ─────────────────────────────────────────────────────────────
const ListCard = ({ list, isOwner, onEdit, onShare, onDelete, onOpen }) => (
  <div className="group bg-[#1e2329] border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all flex items-center gap-4">
    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center shrink-0">
      <List size={18} className="text-indigo-400" />
    </div>
    <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-white font-semibold text-sm truncate">
          {list.title}
        </span>
        <VisibilityBadge visibility={list.visibility} />
        <RoleBadge role={list.my_role} />
      </div>
      {list.description && (
        <p className="text-xs text-neutral-500 mt-0.5 truncate">
          {list.description}
        </p>
      )}
      <div className="flex items-center gap-3 mt-1">
        <span className="text-xs text-neutral-500">
          {list.card_count ?? 0} cards
        </span>
        {!isOwner && (
          <span className="text-xs text-neutral-600">by {list.owner_name}</span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      <button
        onClick={onOpen}
        title="View cards"
        className="p-2 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-colors"
      >
        <ChevronRight size={16} />
      </button>
      {isOwner && (
        <>
          <button
            onClick={onShare}
            title="Share"
            className="p-2 rounded-lg hover:bg-indigo-500/10 text-neutral-400 hover:text-indigo-400 transition-colors"
          >
            <Users size={16} />
          </button>
          <button
            onClick={onEdit}
            title="Edit"
            className="p-2 rounded-lg hover:bg-sky-500/10 text-neutral-400 hover:text-sky-400 transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="p-2 rounded-lg hover:bg-red-500/10 text-neutral-400 hover:text-red-400 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </>
      )}
    </div>
  </div>
);

export default Lists;
