import React, { useContext } from "react";
import { AppContent } from "../../context/AppContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Setting = () => {
  const { userData, setUserData, setLoggedIn } = useContext(AppContent);
  const navigate = useNavigate();
  console.log(userData);
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
  return (
    <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#272e36] p-8 shadow-lg">
      <h2 className="text-2xl font-semibold text-white mb-4 text-center">
        Settings
      </h2>
      <br />
      {/* Email verification removed - all users must verify during registration */}
      
      <div className="space-y-3">
        <button
          onClick={navigateToReset}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-white font-medium shadow-md hover:bg-indigo-500"
        >
          Change Password
        </button>
      </div>
      <br />
      <div className="space-y-3">
        <button
          onClick={logout}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-white font-medium shadow-md hover:bg-indigo-500"
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default Setting;
