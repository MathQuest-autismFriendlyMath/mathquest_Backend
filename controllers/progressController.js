import Progress from "../models/Progress.js";
import PerformanceLog from "../models/PerformanceLog.js";
import { AppError, catchAsync } from "../utils/errorHandler.js";
import { MASTERY_THRESHOLDS } from "../config/constants.js";

// @desc    Get user progress for all modules
// @route   GET /api/progress/:userId
// @access  Private
export const getUserProgress = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  const progressData = await Progress.find({ userId }).sort({
    lastUpdated: -1,
  });

  // Calculate overall statistics
  const overallStats = {
    totalSessions: progressData.reduce(
      (sum, p) => sum + p.completedSessions,
      0,
    ),
    averageAccuracy:
      progressData.reduce((sum, p) => sum + p.accuracy, 0) /
      (progressData.length || 1),
    masteredModules: progressData.filter((p) => p.masteryLevel === "mastered")
      .length,
    totalTimeSpent: progressData.reduce((sum, p) => sum + p.totalTimeSpent, 0),
  };

  res.status(200).json({
    success: true,
    data: {
      progress: progressData,
      overallStats,
    },
  });
});

// @desc    Get progress for specific module
// @route   GET /api/progress/:userId/:moduleName
// @access  Private
export const getModuleProgress = catchAsync(async (req, res, next) => {
  const { userId, moduleName } = req.params;

  let progress = await Progress.findOne({ userId, moduleName });

  if (!progress) {
    // Create new progress entry
    progress = await Progress.create({ userId, moduleName });
  }

  res.status(200).json({
    success: true,
    data: { progress },
  });
});

// @desc    Update module progress
// @route   POST /api/progress/update
// @access  Private
export const updateProgress = catchAsync(async (req, res, next) => {
  const {
    userId,
    moduleName,
    sessionData, // { correct, total, responseTime, difficulty, concepts }
  } = req.body;

  if (!userId || !moduleName || !sessionData) {
    return next(new AppError("Missing required fields", 400));
  }

  let progress = await Progress.findOne({ userId, moduleName });

  if (!progress) {
    progress = new Progress({ userId, moduleName });
  }

  // Update statistics
  progress.completedSessions += 1;
  progress.totalQuestions += sessionData.total;
  progress.correctAnswers += sessionData.correct;
  progress.accuracy = Math.round(
    (progress.correctAnswers / progress.totalQuestions) * 100,
  );
  progress.lastSessionDate = Date.now();

  // Update average response time
  const totalResponses = progress.completedSessions;
  progress.averageResponseTime =
    (progress.averageResponseTime * (totalResponses - 1) +
      sessionData.responseTime) /
    totalResponses;

  // Update difficulty if provided
  if (sessionData.difficulty) {
    progress.currentDifficulty = sessionData.difficulty;
  }

  // Track concepts if provided
  if (sessionData.concepts) {
    sessionData.concepts.forEach((concept) => {
      if (concept.correct) {
        const existing = progress.strengths.find(
          (s) => s.concept === concept.name,
        );
        if (existing) {
          existing.accuracy = Math.min(100, existing.accuracy + 5);
        } else {
          progress.strengths.push({ concept: concept.name, accuracy: 70 });
        }
      } else {
        const existing = progress.weakAreas.find(
          (w) => w.concept === concept.name,
        );
        if (existing) {
          existing.attemptsCount += 1;
          existing.accuracy = Math.max(0, existing.accuracy - 5);
        } else {
          progress.weakAreas.push({
            concept: concept.name,
            accuracy: 30,
            attemptsCount: 1,
          });
        }
      }
    });
  }

  // Update total time spent
  progress.totalTimeSpent += sessionData.timeSpent || 0;

  await progress.save();

  res.status(200).json({
    success: true,
    message: "Progress updated successfully",
    data: { progress },
  });
});

// @desc    Get performance analytics
// @route   GET /api/progress/analytics/:userId
// @access  Private
export const getAnalytics = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { days = 7 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  // Get recent performance logs
  const recentLogs = await PerformanceLog.find({
    userId,
    timestamp: { $gte: startDate },
  }).sort({ timestamp: -1 });

  // Aggregate by module
  const modulePerformance = {};
  recentLogs.forEach((log) => {
    if (!modulePerformance[log.moduleName]) {
      modulePerformance[log.moduleName] = {
        total: 0,
        correct: 0,
        totalTime: 0,
      };
    }
    modulePerformance[log.moduleName].total += 1;
    if (log.isCorrect) modulePerformance[log.moduleName].correct += 1;
    modulePerformance[log.moduleName].totalTime += log.responseTime;
  });

  // Calculate analytics
  const analytics = Object.entries(modulePerformance).map(
    ([module, stats]) => ({
      module,
      accuracy: Math.round((stats.correct / stats.total) * 100),
      totalAttempts: stats.total,
      averageResponseTime: Math.round(stats.totalTime / stats.total),
    }),
  );

  // Get progress data
  const progress = await Progress.find({ userId });

  res.status(200).json({
    success: true,
    data: {
      analytics,
      progress,
      period: `${days} days`,
    },
  });
});

// @desc    Get strengths and weaknesses
// @route   GET /api/progress/insights/:userId
// @access  Private
export const getInsights = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  const progress = await Progress.find({ userId });

  const strengths = [];
  const weaknesses = [];
  const recommendations = [];

  progress.forEach((p) => {
    // Identify strengths
    if (p.masteryLevel === "mastered" || p.masteryLevel === "proficient") {
      strengths.push({
        module: p.moduleName,
        masteryLevel: p.masteryLevel,
        accuracy: p.accuracy,
      });
    }

    // Identify weaknesses
    if (p.masteryLevel === "beginner" || p.accuracy < 60) {
      weaknesses.push({
        module: p.moduleName,
        accuracy: p.accuracy,
        weakConcepts: p.weakAreas.slice(0, 3),
      });

      recommendations.push({
        module: p.moduleName,
        suggestion: `Practice ${p.moduleName} with guided mode`,
        priority: p.accuracy < 40 ? "high" : "medium",
      });
    }
  });

  res.status(200).json({
    success: true,
    data: {
      strengths,
      weaknesses,
      recommendations,
    },
  });
});
