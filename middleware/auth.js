import { verifyToken } from "../utils/jwt.js";
import { AppError } from "../utils/errorHandler.js";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new AppError("Not authorized. Please log in.", 401));
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return next(
        new AppError("Invalid or expired token. Please log in again.", 401),
      );
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return next(new AppError("User no longer exists.", 401));
    }

    if (!user.isActive) {
      return next(new AppError("Your account has been deactivated.", 401));
    }

    req.user = user;
    next();
  } catch (error) {
    next(new AppError("Authentication failed.", 401));
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action.", 403),
      );
    }
    next();
  };
};

export const authorizeChild = async (req, res, next) => {
  try {
    const childId = req.params.childId || req.body.childId;

    if (req.user.role === "child" && req.user._id.toString() !== childId) {
      return next(new AppError("You can only access your own data.", 403));
    }

    if (req.user.role === "parent") {
      const child = await User.findById(childId);
      if (!child || child.parentId?.toString() !== req.user._id.toString()) {
        return next(
          new AppError("You can only access your linked children.", 403),
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
