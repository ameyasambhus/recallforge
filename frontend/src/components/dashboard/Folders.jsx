import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Trash2, Folder, Edit2 } from "lucide-react";

const Folders = () => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editName, setEditName] = useState("");

  // Delete State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/card/folders");
      if (data.success) {
        setFolders(data.folders);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to fetch folders");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  const handleEditClick = (folder) => {
    setEditingFolder(folder);
    setEditName(folder.name);
    setShowEditModal(true);
  };

  const handleUpdateFolder = async () => {
    if (!editName.trim()) {
      toast.error("Folder name cannot be empty");
      return;
    }
    try {
      const res = await axios.put(`/api/card/folder/${editingFolder._id}/update`, { name: editName });
      if (res.data.success) {
        toast.success("Folder updated successfully!");
        setShowEditModal(false);
        setEditingFolder(null);
        fetchFolders();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update folder");
    }
  };

  const handleDeleteClick = (folder) => {
    setFolderToDelete(folder);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const res = await axios.delete(`/api/card/folder/${folderToDelete._id}/delete`);
      if (res.data.success) {
        toast.success("Folder deleted successfully!");
        setShowDeleteModal(false);
        setFolderToDelete(null);
        fetchFolders();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete folder");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-2 md:p-6 relative">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 md:mb-8">
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Manage Folders</h1>
          <p className="text-gray-400 mt-1 text-sm">
            View, rename, and organize your {folders.length} folders
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 text-gray-400 animate-pulse gap-2">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading folders...</span>
        </div>
      ) : (
        <div className="bg-[#1e2329] rounded-2xl border border-white/5 overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-[#272e36] text-xs uppercase font-semibold text-gray-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Folder Name</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {folders.map((folder) => (
                  <tr
                    key={folder._id}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                      <Folder className="w-5 h-5 text-indigo-400 opacity-80" />
                      {folder.name}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(folder)}
                          className="p-2 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg transition-all opacity-60 group-hover:opacity-100"
                          title="Rename Folder"
                        >
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(folder)}
                          className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all opacity-60 group-hover:opacity-100"
                          title="Delete Folder"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {folders.length === 0 && (
                  <tr>
                    <td colSpan="2" className="px-6 py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Folder className="w-8 h-8 opacity-20" />
                        <p>No folders found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Folder Modal */}
      {showEditModal && editingFolder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-[#1e2329] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold text-white">Rename Folder</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Folder Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#272e36] p-3 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 outline-none transition-all"
                  autoFocus
                />
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
                  onClick={handleUpdateFolder}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && folderToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-[#1e2329] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
              <h3 className="text-xl font-bold text-white">Delete Folder</h3>
            </div>
            <p className="text-gray-300 mb-2">
              Are you sure you want to delete the folder <span className="font-semibold text-white">"{folderToDelete.name}"</span>?
            </p>
            <p className="text-yellow-500/90 text-sm mb-6 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
              Note: This will not delete the cards inside the folder, but their folder association will be removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg bg-[#272e36] text-gray-300 hover:bg-[#2a3441] transition-colors border border-white/5"
                onClick={() => setShowDeleteModal(false)}
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

export default Folders;
