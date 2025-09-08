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

  const handleSubmit = async () => {
    try {
      axios.defaults.withCredentials = true;
      if (tab == "login") {
        const { data } = await axios.post("/api/auth/login", {
          email,
          password,
        });
        if (data.success) {
          setLoggedIn(true);
          getUserData();
          navigate("/app/log");
        } else {
          toast.error(data.message);
        }
      } else {
        const { data } = await axios.post("/api/auth/register", {
          name,
          email,
          password,
        });
        if (data.success) {
          setLoggedIn(true);
          getUserData();
          navigate("/email-verify");
        } else {
          toast.error(data.message);
        }
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      console.error("Error during authentication:", error);
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
          <h1 className="text-2xl font-bold text-[#605dff]">
            Welcome to RecallForge
          </h1>
          <p className="text-gray-400 mt-1">
            Join thousands of students mastering their studies
          </p>
        </div>

        <div className="flex mb-6">
          <button
            className={`btn btn-primary w-1/2 py-2 mr-1 text-sm font-medium rounded-l ${
              tab === "login"
                ? "bg-black text-white"
                : "bg-zinc-800 text-gray-400"
            }`}
            onClick={() => setTab("login")}
          >
            Login
          </button>
          <button
            className={`btn btn-primary w-1/2 py-2  text-sm font-medium rounded-r ${
              tab === "signup"
                ? "bg-black text-white"
                : "bg-zinc-800 text-gray-400"
            }`}
            onClick={() => setTab("signup")}
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
            <button
              className="w-full py-2 rounded bg-gradient-to-r from-[#605dff] to-[#2826a1] font-semibold"
              onClick={handleSubmit}
            >
              Create Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
