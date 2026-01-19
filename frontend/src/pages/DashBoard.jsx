import React, { useContext, useEffect } from "react";
import Log from "../components/dashboard/Log";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import Setting from "../components/dashboard/Setting";
import { AppContent } from "../context/AppContext";
import Review from "../components/dashboard/Review";
import AllCards from "../components/dashboard/AllCards";

import { User, LogOut, Settings, FileJson, KeyRound } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useState, useRef } from "react";

const TopNav = () => {
  const { userData, setUserData, setLoggedIn } = useContext(AppContent);
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const exportData = async () => {
    try {
      const { data } = await axios.get("/api/data/export");
      if (data.success) {
        const jsonString = JSON.stringify(data.data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `recallforge_backup_${new Date().toISOString().split("T")[0]}.json`;
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
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        console.error("Import error:", error);
        toast.error("Invalid JSON file or import failed");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
    setIsDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="text-xl font-semibold tracking-tight text-white">
            RecallForge
          </span>
          {userData && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 ml-4 rounded-full bg-white/5 border border-white/10" title="Daily Streak">
              <span className="text-lg leading-none">
                {userData.currentStreak > 0 ? "🔥" : "😢"}
              </span>
              <span className="font-mono font-bold text-white">
                {userData.currentStreak || 0}
              </span>
            </div>
          )}
        </div>

        <nav aria-label="Primary" className="flex items-center gap-3">
          {userData && (
            <div className="sm:hidden flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10">
              <span className="text-base">
                {userData.currentStreak > 0 ? "🔥" : "😢"}
              </span>
              <span className="text-sm font-bold text-white">
                {userData.currentStreak || 0}
              </span>
            </div>
          )}
          <div className="md:flex items-center gap-3">
            <Link to="/app/log" className="btn btn-primary bg-transparent text-sm">
              Log
            </Link>
            <Link to="/app/review" className="btn btn-primary bg-transparent text-sm">
              Review
            </Link>
            <Link to="/app/cards" className="btn btn-primary bg-transparent text-sm">
              Cards
            </Link>
          </div>

          <Link to="/app/settings" className="btn btn-primary bg-transparent text-sm">
            Settings
          </Link>

          {/* User Dropdown */}
          <div className="relative ml-2" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-500 focus:outline-none"
            >
              <User size={18} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-white/10 bg-[#272e36] p-1 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="px-3 py-2 border-b border-white/5 mb-1">
                  <p className="text-sm font-medium text-white truncate">{userData?.name || 'User'}</p>
                  <p className="text-xs text-neutral-400 truncate">{userData?.email}</p>
                </div>
                
                <Link
                  to="/reset-pass"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <KeyRound size={16} />
                  Change Password
                </Link>

                <button
                  onClick={() => {
                     exportData();
                     setIsDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white text-left"
                >
                  <FileJson size={16} />
                  Export Data
                </button>

                <label className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white">
                  <FileJson size={16} />
                  Import Data
                  <input
                    type="file"
                    accept=".json"
                    onChange={importData}
                    className="hidden"
                  />
                </label>

                <div className="my-1 border-t border-white/5"></div>
                
                <button
                  onClick={() => {
                    logout();
                    setIsDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-500 text-left"
                >
                  <LogOut size={16} />
                  Log Out
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { loggedIn, userData } = useContext(AppContent);
  const redirect = async () => {
    if (!loggedIn) {
      navigate("/auth");
    }
    // Removed email verification check - all users must verify during registration
  };
  useEffect(() => {
    redirect();
  }, [loggedIn, userData]);
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <TopNav />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 flex justify-center">
        <Routes>
          <Route path="log" element={<Log />} />
          <Route path="review" element={<Review />} />
          <Route path="cards" element={<AllCards />} />
          <Route path="settings" element={<Setting />} />
        </Routes>
      </main>
    </div>
  );
}
