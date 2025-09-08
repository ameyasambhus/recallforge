import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import toast, { useToasterStore } from "react-hot-toast";
import { AppContent } from "../context/AppContext";

const EmailVerify = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const { userData, getUserData, loggedIn } = useContext(AppContent);

  const sendOtp = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post("/api/auth/send-verify-otp");
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
        console.log(data.message);
      }
    } catch (error) {
      toast.error(error.message);
      console.log(error.message);
    }
  };
  const handleVerify = async () => {
    try {
      const { data } = await axios.post("/api/auth/verify-account", { otp });

      if (data.success) {
        toast.success(data.message);
        await getUserData();
        navigate("/app/log");
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("Waited 2 seconds!");
      loggedIn &&
        userData &&
        userData.isAccountVerified &&
        navigate("/app/log");
      if (!sessionStorage.getItem("otpSent")) {
        sendOtp();
        sessionStorage.setItem("otpSent", "true");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [loggedIn, userData]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-lg p-6 shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#605dff]">
            Welcome {userData ? userData.name : "User"}, Verify Your Email
          </h1>
          <p className="text-gray-400 mt-1">
            Enter 6-digit code sent to your email
          </p>
        </div>

        <div>
          <input
            type="text"
            className="w-full px-3 py-2 rounded bg-zinc-800 border border-gray-700"
            required
            placeholder="6-digit code"
            onChange={(e) => setOtp(e.target.value)}
          />
        </div>
        <br />
        <div>
          <button onClick={handleVerify} className="btn btn-primary w-full">
            Verify Email
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerify;
