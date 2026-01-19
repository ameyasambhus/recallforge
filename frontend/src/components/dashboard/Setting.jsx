import React, { useContext } from "react";
import { AppContent } from "../../context/AppContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const Setting = () => {
  const { userData, setUserData, setLoggedIn } = useContext(AppContent);
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [confirmationEmail, setConfirmationEmail] = React.useState("");

  const navigateToReset = async () => {
    navigate("/reset-pass");
  };

  const logout = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post("/api/auth/logout");
      if (data.success) {
        setLoggedIn(false);
        setUserData(false);
        navigate("/");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("An error occurred while logging out.");
      console.error("Error logging out:", error);
    }
  };

  const deleteAccount = async () => {
    if (
      confirmationEmail.trim().toLowerCase() !==
      userData?.email?.trim().toLowerCase()
    ) {
      toast.error("Email does not match.");
      return;
    }

    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.delete("/api/user/delete");
      if (data.success) {
        toast.success("Account deleted successfully.");
        logout();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("An error occurred while deleting the account.");
      console.error("Error deleting account:", error);
    }
  };

  const exportData = async () => {
    try {
      const { data } = await axios.get("/api/data/export");
      if (data.success) {
        const jsonString = JSON.stringify(data.data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `recallforge_backup_${new Date().toISOString().split("T")[0]
          }.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Data exported successfully");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    }
  };

  const importData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        const { data } = await axios.post("/api/data/import", {
          data: jsonData,
        });
        if (data.success) {
          toast.success(data.message);
          // Optional: Reload data or notify user
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        console.error("Import error:", error);
        toast.error("Invalid JSON file or import failed");
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again if needed
    event.target.value = "";
  };

  return (
    <>
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#272e36] p-8 shadow-lg">
        <h2 className="mb-4 text-center text-2xl font-semibold text-white">
          Settings
        </h2>
        <br />
        {/* Email verification removed - all users must verify during registration */}

        <div className="space-y-3">
          <button
            onClick={navigateToReset}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white shadow-md hover:bg-indigo-500"
          >
            Change Password
          </button>
        </div>
        <br />

        <div className="space-y-3">
          <button
            onClick={exportData}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white shadow-md hover:bg-indigo-500"
          >
            Export Data (JSON)
          </button>

          <label className="block w-full cursor-pointer rounded-xl bg-indigo-600 px-4 py-3 text-center font-medium text-white shadow-md hover:bg-indigo-500">
            Import Data (JSON)
            <input
              type="file"
              accept=".json"
              onChange={importData}
              className="hidden"
            />
          </label>
        </div>
        <br />

        <div className="space-y-3">
          <button
            onClick={logout}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white shadow-md hover:bg-indigo-500"
          >
            Log Out
          </button>
        </div>
        <br />

        <div className="space-y-3 border-t border-white/10 pt-6">
          <h3 className="mb-2 text-lg font-medium text-red-500">Danger Zone</h3>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full rounded-xl bg-red-600 px-4 py-3 font-medium text-white shadow-md hover:bg-red-500 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative w-full max-w-md gap-4 rounded-xl border border-white/10 bg-[#272e36] p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Delete Account</h3>
            <p className="mt-2 text-neutral-300">
              This action cannot be undone. This will permanently delete your
              account and remove your data from our servers.
            </p>
            <p className="mt-4 text-sm text-neutral-400">
              Please type <span className="font-mono font-bold text-white dark:text-white select-all">{userData?.email}</span> to confirm.
            </p>
            <input
              type="text"
              value={confirmationEmail}
              onChange={(e) => setConfirmationEmail(e.target.value)}
              placeholder="Enter your email"
              className="mt-2 w-full rounded-lg border border-white/10 bg-neutral-900 px-4 py-2 text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={
                  confirmationEmail.trim().toLowerCase() !==
                  userData?.email?.trim().toLowerCase()
                }
                onClick={deleteAccount}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Setting;
