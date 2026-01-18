import React, { useContext } from "react";
import { AppContent } from "../../context/AppContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const Setting = () => {
  const { userData, setUserData, setLoggedIn } = useContext(AppContent);
  const navigate = useNavigate();

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

  const exportData = async () => {
    try {
      const { data } = await axios.get("/api/data/export");
      if (data.success) {
        const jsonString = JSON.stringify(data.data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `recallforge_backup_${new Date().toISOString().split("T")[0]
          }.json`;
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
          // Optional: Reload data or notify user
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        console.error("Import error:", error);
        toast.error("Invalid JSON file or import failed");
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again if needed
    event.target.value = "";
  };

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#272e36] p-8 shadow-lg">
      <h2 className="mb-4 text-center text-2xl font-semibold text-white">
        Settings
      </h2>
      <br />
      {/* Email verification removed - all users must verify during registration */}

      <div className="space-y-3">
        <button
          onClick={navigateToReset}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white shadow-md hover:bg-indigo-500"
        >
          Change Password
        </button>
      </div>
      <br />

      <div className="space-y-3">
        <button
          onClick={exportData}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white shadow-md hover:bg-indigo-500"
        >
          Export Data (JSON)
        </button>

        <label className="block w-full cursor-pointer rounded-xl bg-indigo-600 px-4 py-3 text-center font-medium text-white shadow-md hover:bg-indigo-500">
          Import Data (JSON)
          <input
            type="file"
            accept=".json"
            onChange={importData}
            className="hidden"
          />
        </label>
      </div>
      <br />

      <div className="space-y-3">
        <button
          onClick={logout}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white shadow-md hover:bg-indigo-500"
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default Setting;
