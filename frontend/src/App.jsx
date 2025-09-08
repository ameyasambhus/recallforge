import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import "./App.css";
import DashBoard from "./pages/DashBoard";
import { Toaster } from "react-hot-toast";
import EmailVerify from "./pages/EmailVerify";
import ResetPass from "./pages/ResetPass";

function App() {
  return (
    <div>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/app/*" element={<DashBoard />} />
          <Route path="/email-verify" element={<EmailVerify />} />
          <Route path="/reset-pass" element={<ResetPass />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
