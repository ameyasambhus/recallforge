import React, { useContext } from "react";
import { AppContent } from "../../context/AppContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

import Heatmap from "./Heatmap";

const Setting = () => {
  const { userData, setUserData, setLoggedIn } = useContext(AppContent);
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [confirmationEmail, setConfirmationEmail] = React.useState("");

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

  return (
    <>
      <div className="w-full rounded-2xl border border-white/10 bg-[#272e36] p-8 shadow-lg">
        <h2 className="mb-4 text-center text-2xl font-semibold text-white">
          Settings
        </h2>
        
        {userData?.reviewHistory && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-white mb-2 ml-1">Activity</h3>
            <div className="p-4 rounded-xl bg-neutral-900/50 border border-white/5">
              <Heatmap reviewHistory={userData.reviewHistory} />
            </div>
          </div>
        )}
        
        <div className="space-y-3 pt-4 border-t border-white/10">
          <h3 className="mb-2 text-lg font-medium text-red-500">Danger Zone</h3>
          <p className="text-sm text-neutral-400 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full sm:w-auto rounded-xl bg-red-600/10 border border-red-600/50 px-6 py-2.5 font-medium text-red-500 shadow-md hover:bg-red-600 hover:text-white transition-all duration-200"
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
