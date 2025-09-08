import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

const userAuth = async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    return res.json({ success: false, message: "Not authorized. Login again" });
  }

  try {
    const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
    if (tokenDecode.id) {
      req.userId = tokenDecode.id;
      const user = await userModel.findById(tokenDecode.id);
      if (!user) {
        return res.json({ success: false, message: "User not found" });
      }
      req.user = user;
    } else {
      return res.json({
        success: false,
        message: "Not authorized. Login again",
      });
    }
    next();
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};

export default userAuth;
