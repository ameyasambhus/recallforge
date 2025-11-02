import axios from "axios";
import { createContext, useEffect, useState } from "react";
import toast from "react-hot-toast";

export const AppContent = createContext();

export const AppContextProvider = (props) => {
  axios.defaults.withCredentials = true;
  const [loggedIn, setLoggedIn] = useState(false);
  const [userData, setUserData] = useState(false);

  const getAuthState = async () => {
    try {
      const { data } = await axios.get("/api/auth/is-auth");
      if (data.success) {
        // Get user data to check verification status
        await getUserData();
        // Don't set loggedIn here - let the component decide based on verification
      }
    } catch (error) {
      // Silently fail - user is not authenticated
      console.error("Error fetching auth state:", error);
    }
  };

  const getUserData = async () => {
    try {
      const { data } = await axios.get("/api/user/data");
      if (data.success) {
        setUserData(data.userData);
        // Only set loggedIn to true if the account is verified
        if (data.userData.isAccountVerified) {
          setLoggedIn(true);
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      if (error.response && error.response.status === 429) {
        toast.error("Too many requests. Please try after some time");
      } else {
        // Silently fail on error
        console.error("Error fetching user data:", error);
      }
    }
  };

  useEffect(() => {
    getAuthState();
  }, []);

  const value = { loggedIn, userData, setLoggedIn, setUserData, getUserData };
  return (
    <AppContent.Provider value={value}>{props.children}</AppContent.Provider>
  );
};
