import React, { useContext, useEffect } from "react";
import Log from "../components/dashboard/Log";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import Setting from "../components/dashboard/Setting";
import { AppContent } from "../context/AppContext";
import Review from "../components/dashboard/Review";
import AllCards from "../components/dashboard/AllCards";

const TopNav = () => (
  <header className="sticky top-0 z-50 border-b border-white/5 bg-neutral-950/80 backdrop-blur">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <span className="text-xl font-semibold tracking-tight text-white">
          RecallForge
        </span>
      </div>

      <nav aria-label="Primary" className="flex items-center gap-3">
        <div className="md:flex items-center gap-3">
          <Link to="/app/log" className="btn btn-primary bg-transparent">
            Log
          </Link>
          <Link to="/app/review" className="btn btn-primary bg-transparent">
            Review
          </Link>
          <Link to="/app/cards" className="btn btn-primary bg-transparent">
            Cards
          </Link>
        </div>

        <Link to="/app/settings" className="btn btn-primary bg-transparent">
          Settings
        </Link>
      </nav>
    </div>
  </header>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { loggedIn } = useContext(AppContent);
  const redirect = async () => {
    if (!loggedIn) {
      navigate("/auth");
    }
  };
  useEffect(() => {
    redirect();
  }, []);
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
