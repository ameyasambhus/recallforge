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
        setLoggedIn(true);
        getUserData();
      }
    } catch (error) {
      toast.error("An error occurred while fetching auth state.");
      console.error("Error fetching auth state:", error);
    }
  };

  const getUserData = async () => {
    try {
      const { data } = await axios.get("/api/user/data");
      if (data.success) {
        setUserData(data.userData);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      if (error.response.status === 429) {
        toast.error("Too many requests. Please try after some time");
      } else {
        toast.error("An error occurred while fetching user data.");
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
