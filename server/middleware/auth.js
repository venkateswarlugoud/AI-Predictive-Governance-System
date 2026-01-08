import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectRoute = async (req, res, next) => {
  try {
    console.log("🔐 Auth middleware called");
    const authHeader = req.headers.authorization;
    console.log("Auth header present:", !!authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No valid auth header");
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("Token extracted:", token ? "Yes" : "No");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token decoded. User ID:", decoded.id);

    const user = await User.findById(decoded.id).select("-password");
    console.log("User found in DB:", user ? "Yes" : "No");

    if (!user) {
      console.log("❌ User not found in database");
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Ensure user object has _id
    if (!user._id) {
      console.error("❌ User object missing _id:", user);
      return res.status(401).json({
        success: false,
        message: "Invalid user data",
      });
    }

    console.log("✅ Auth successful. Setting req.user with ID:", user._id);
    req.user = user;
    console.log("✅ req.user set. req.user._id:", req.user._id);
    next();
  } catch (error) {
    console.error("❌ Auth middleware error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
};
