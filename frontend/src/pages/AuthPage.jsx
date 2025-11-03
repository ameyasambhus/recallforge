import { use, useContext, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { AppContent } from "../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";

const AuthPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const { setLoggedIn, getUserData, userData, loggedIn } =
    useContext(AppContent);

  const navigateToReset = async () => {
    navigate("/reset-pass");
  };

  useEffect(() => {
    if (loggedIn) {
      navigate("/app/log");
    }
  }, [loggedIn, navigate]);

  const handleTabSwitch = (newTab) => {
    setTab(newTab);
    // Reset signup-specific states when switching tabs
    if (newTab === "login") {
      setOtpSent(false);
      setOtp("");
    }
  };

  const sendOtp = async () => {
    try {
      console.log("Attempting to register user...");
      // First, we need to register the user to get authentication for OTP
      axios.defaults.withCredentials = true;
      const { data } = await axios.post("/api/auth/register", {
        name,
        email,
        password,
      });

      if (data.success) {
        // User registered, now send OTP
        console.log("User registered successfully");
        console.log("Sending OTP...");
        const otpResponse = await axios.post("/api/auth/send-verify-otp", { email });

        if (otpResponse.data.success) {
          toast.success(otpResponse.data.message);
          setOtpSent(true);
        } else {
          toast.error(otpResponse.data.message);
          console.log("Error is in otpResponse");
          if (otpResponse.data.accountDeleted) {
            setOtpSent(false);
            setOtp("");
          }
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error in sendOtp:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to send OTP. Please try again.";
      toast.error(errorMessage);
      // Reset form on error
      setOtpSent(false);
      setOtp("");
    }
  };

  const verifyOtp = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post("/api/auth/verify-account", {email, otp });

      if (data.success) {
        toast.success(data.message);
        setTab("login");
      } else {
        toast.error(data.message);
          setOtp("");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to verify OTP");
      console.error("Error verifying OTP:", error);
      // Reset form on error
      setOtpSent(false);
      setOtp("");
    }
  };

  const handleSubmit = async () => {
    try {
      axios.defaults.withCredentials = true;
        const { data } = await axios.post("/api/auth/login", {
          email,
          password,
        });
        if (data.success) {
          setLoggedIn(true);
          navigate("/app/log");
        } else {
          toast.error(data.message);
        }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      console.error("Error during authentication:", error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-lg p-6 shadow-lg">

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#605dff]">
            Welcome to RecallForge
          </h1>
          <p className="text-gray-400 mt-1">
            Join thousands of students mastering their studies
          </p>
        </div>

        <div className="flex mb-6">
          <button
            className={`btn btn-primary w-1/2 py-2 mr-1 text-sm font-medium rounded-l ${tab === "login"
                ? "bg-black text-white"
                : "bg-zinc-800 text-gray-400"
              }`}
            onClick={() => handleTabSwitch("login")}
          >
            Login
          </button>
          <button
            className={`btn btn-primary w-1/2 py-2  text-sm font-medium rounded-r ${tab === "signup"
                ? "bg-black text-white"
                : "bg-zinc-800 text-gray-400"
              }`}
            onClick={() => handleTabSwitch("signup")}
          >
            Sign Up
          </button>
        </div>

        {tab === "login" ? (
          <div>
            <div>
              <label className="block text-sm mb-1" htmlFor="login-email">
                Email
              </label>
              <input
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                id="login-email"
                className="w-full px-3 py-2 rounded bg-zinc-800 border border-gray-700"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm mb-1" htmlFor="login-password">
                Password
              </label>
              <div className="relative">
                <input
                  onChange={(e) => setPassword(e.target.value)}
                  value={password}
                  type={showPassword ? "text" : "password"}
                  id="login-password"
                  className="w-full px-3 py-2 pr-10 rounded bg-zinc-800 border border-gray-700"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <br />
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-[#605dff] hover:underline"
                onClick={navigateToReset}
              >
                Forgot password?
              </button>
            </div>

            <br />
            <button
              className="btn btn-primary w-full py-2 rounded bg-gradient-to-r from-[#605dff] to-[#2f2da5] font-semibold"
              onClick={handleSubmit}
            >
              Sign In
            </button>
          </div>
        ) : (
          <div>
            <div>
              <label className="block text-sm mb-1" htmlFor="first-name">
                Name
              </label>
              <input
                type="text"
                onChange={(e) => setName(e.target.value)}
                value={name}
                id="first-name"
                placeholder="John Doe"
                className="w-full px-3 py-2 rounded bg-zinc-800 border border-gray-700"
                disabled={otpSent}
              />
            </div>

            <div>
              <label className="block text-sm mb-1" htmlFor="signup-email">
                Email
              </label>
              <input
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                id="signup-email"
                placeholder="Enter your email"
                className="w-full px-3 py-2 rounded bg-zinc-800 border border-gray-700"
                disabled={otpSent}
              />
            </div>

            <div>
              <label className="block text-sm mb-1" htmlFor="signup-password">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="signup-password"
                  placeholder="Create a password"
                  className="w-full px-3 py-2 pr-10 rounded bg-zinc-800 border border-gray-700"
                  onChange={(e) => setPassword(e.target.value)}
                  value={password}
                  disabled={otpSent}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  disabled={otpSent}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <br />

            {!otpSent ? (
              <button
                className="w-full py-2 rounded bg-gradient-to-r from-[#605dff] to-[#2826a1] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={sendOtp}
                disabled={!name || !email || !password}
              >
                Send OTP
              </button>
            ) : (
              <>
                <div>
                  <label className="block text-sm mb-1" htmlFor="otp">
                    Enter OTP
                  </label>
                  <input
                    type="text"
                    onChange={(e) => setOtp(e.target.value)}
                    value={otp}
                    id="otp"
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-3 py-2 rounded bg-zinc-800 border border-gray-700"
                    maxLength={6}
                  />
                </div>
                <br />
                <button
                  className="w-full py-2 rounded bg-gradient-to-r from-[#605dff] to-[#2826a1] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={verifyOtp}
                  disabled={!otp || otp.length !== 6}
                >
                  Verify OTP & Create Account
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
