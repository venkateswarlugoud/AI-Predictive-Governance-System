import express from "express";
import {
  registerUser,
  loginUser,
  checkAuth,
} from "../controllers/userController.js";

import { protectRoute } from "../middleware/auth.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);

// Protected route
userRouter.get("/check", protectRoute, checkAuth);

export default userRouter;
