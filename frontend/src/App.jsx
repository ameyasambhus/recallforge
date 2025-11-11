import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import "./App.css";
import DashBoard from "./pages/DashBoard";
import { Toaster } from "react-hot-toast";
import ResetPass from "./pages/ResetPass";

function App() {
  return (
    <div className="min-h-screen bg-neutral-950">
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/app/*" element={<DashBoard />} />
          <Route path="/reset-pass" element={<ResetPass />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
