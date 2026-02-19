import PerformanceLog from "../models/PerformanceLog.js";
import { catchAsync } from "../utils/errorHandler.js";
import { v4 as uuidv4 } from "uuid";

// @desc    Log performance data
// @route   POST /api/performance/log
// @access  Private
export const logPerformance = catchAsync(async (req, res, next) => {
  const {
    userId,
    moduleName,
    questionType,
    question,
    userAnswer,
    correctAnswer,
    isCorrect,
    responseTime,
    difficultyLevel,
    hintsUsed,
    conceptTags,
  } = req.body;

  const sessionId = req.body.sessionId || uuidv4();

  const performanceLog = await PerformanceLog.create({
    userId,
    moduleName,
    sessionId,
    questionType,
    question,
    userAnswer,
    correctAnswer,
    isCorrect,
    responseTime,
    difficultyLevel,
    hintsUsed: hintsUsed || 0,
    conceptTags: conceptTags || [],
  });

  res.status(201).json({
    success: true,
    message: "Performance logged successfully",
    data: { log: performanceLog },
  });
});

// @desc    Get performance history
// @route   GET /api/performance/:userId
// @access  Private
export const getPerformanceHistory = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { moduleName, limit = 50, startDate, endDate } = req.query;

  const query = { userId };

  if (moduleName) {
    query.moduleName = moduleName;
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  const logs = await PerformanceLog.find(query)
    .sort({ timestamp: -1 })
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    count: logs.length,
    data: { logs },
  });
});

// @desc    Get session performance
// @route   GET /api/performance/session/:sessionId
// @access  Private
export const getSessionPerformance = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;

  const logs = await PerformanceLog.find({ sessionId }).sort({ timestamp: 1 });

  if (logs.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Session not found",
    });
  }

  const correctCount = logs.filter((log) => log.isCorrect).length;
  const avgResponseTime =
    logs.reduce((sum, log) => sum + log.responseTime, 0) / logs.length;

  const summary = {
    sessionId,
    moduleName: logs[0].moduleName,
    totalQuestions: logs.length,
    correctAnswers: correctCount,
    accuracy: Math.round((correctCount / logs.length) * 100),
    averageResponseTime: Math.round(avgResponseTime),
    difficultyLevel: logs[0].difficultyLevel,
    completedAt: logs[logs.length - 1].timestamp,
  };

  res.status(200).json({
    success: true,
    data: {
      summary,
      logs,
    },
  });
});
