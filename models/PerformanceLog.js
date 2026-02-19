import mongoose from "mongoose";

const performanceLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    moduleName: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
    questionType: {
      type: String,
      required: true,
    },
    question: {
      type: mongoose.Schema.Types.Mixed,
    },
    userAnswer: {
      type: mongoose.Schema.Types.Mixed,
    },
    correctAnswer: {
      type: mongoose.Schema.Types.Mixed,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    responseTime: {
      type: Number, // in milliseconds
      required: true,
    },
    difficultyLevel: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    hintsUsed: {
      type: Number,
      default: 0,
    },
    attemptsCount: {
      type: Number,
      default: 1,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    conceptTags: [
      {
        type: String,
      },
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for efficient queries
performanceLogSchema.index({ userId: 1, timestamp: -1 });
performanceLogSchema.index({ userId: 1, moduleName: 1, timestamp: -1 });

const PerformanceLog = mongoose.model("PerformanceLog", performanceLogSchema);

export default PerformanceLog;
