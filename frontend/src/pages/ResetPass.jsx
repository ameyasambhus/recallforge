import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import toast, { useToasterStore } from "react-hot-toast";
import { AppContent } from "../context/AppContext";

const ResetPass = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOtpField, setShowOtpField] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const { userData, getUserData, loggedIn, setUserData, setLoggedIn } =
    useContext(AppContent);

  const sendResetOtp = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post("/api/auth/send-reset-otp", { email });
      if (data.success) {
        toast.success(data.message);
        setShowOtpField(true);
        setShowNewPassword(true);
      } else {
        toast.error(data.message);
        console.log(data.message);
      }
    } catch (error) {
      toast.error(error.message);
      console.log(error.message);
    }
  };
  const logout = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post("/api/auth/logout");
      if (data.success) {
        setLoggedIn(false);
        setUserData(false);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("An error occurred while logging out.");
      console.error("Error logging out:", error);
    }
  };
  const handleVerify = async () => {
    try {
      const { data } = await axios.post("/api/auth/reset-password", {
        email,
        otp,
        newPassword,
      });

      if (data.success) {
        toast.success(data.message);
        await getUserData();
        if (loggedIn) {
          await logout();
        }
        navigate("/auth");
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-lg p-6 shadow-lg">
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
          >
            ← Back to Home
          </Link>
        </div>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#605dff]">Reset Password</h1>
          <p className="text-gray-400 mt-1">Enter your email</p>
        </div>

        <div>
          <input
            type="text"
            className="w-full px-3 py-2 rounded bg-zinc-800 border border-gray-700"
            required
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <br />
        <div>
          {showOtpField === true ? (
            <input
              type="text"
              className="w-full px-3 py-2 rounded bg-zinc-800 border border-gray-700"
              placeholder="6-digit code"
              onChange={(e) => setOtp(e.target.value)}
            />
          ) : (
            <div></div>
          )}
        </div>
        <br />
        <div>
          {showNewPassword === true ? (
            <input
              type="text"
              className="w-full px-3 py-2 rounded bg-zinc-800 border border-gray-700"
              placeholder="New Password"
              onChange={(e) => setNewPassword(e.target.value)}
            />
          ) : (
            <div></div>
          )}
        </div>
        <br />
        <div>
          <button
            onClick={showOtpField === true ? handleVerify : sendResetOtp}
            className="btn btn-primary w-full"
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPass;
