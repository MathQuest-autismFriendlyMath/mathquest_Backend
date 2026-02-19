import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/database.js";
import { logger } from "./middleware/logger.js";
import errorHandler from "./middleware/errorHandler.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import performanceRoutes from "./routes/performanceRoutes.js";
import worldRoutes from "./routes/worldRoutes.js";
import adaptiveRoutes from "./routes/adaptiveRoutes.js";
import interactionRoutes from "./routes/interactionRoutes.js";

// Load env vars
dotenv.config();

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "MathQuest API is running",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/worlds", worldRoutes);
app.use("/api/adaptive", adaptiveRoutes);
app.use("/api/interactions", interactionRoutes);

// Welcome route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to MathQuest API",
    version: "1.0.0",
    documentation: "/api/docs",
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎮 MathQuest Backend Server                             ║
║                                                            ║
║   Environment: ${process.env.NODE_ENV || "development"}                                    ║
║   Port: ${PORT}                                              ║
║   Client URL: ${process.env.CLIENT_URL || "http://localhost:5173"}              ║
║                                                            ║
║   Status: ✅ Server is running                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION! Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION! Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

export default app;
