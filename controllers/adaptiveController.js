import adaptiveLearningService from "../services/adaptiveLearning.js";
import { catchAsync } from "../utils/errorHandler.js";

// @desc    Get adaptive recommendations
// @route   GET /api/adaptive/recommendation/:userId/:moduleName
// @access  Private
export const getRecommendation = catchAsync(async (req, res, next) => {
  const { userId, moduleName } = req.params;

  const recommendations = await adaptiveLearningService.getRecommendations(
    userId,
    moduleName,
  );

  res.status(200).json({
    success: true,
    data: { recommendations },
  });
});

// @desc    Get adaptive parameters for session
// @route   GET /api/adaptive/parameters/:userId/:moduleName
// @access  Private
export const getAdaptiveParameters = catchAsync(async (req, res, next) => {
  const { userId, moduleName } = req.params;

  const parameters = await adaptiveLearningService.getAdaptiveParameters(
    userId,
    moduleName,
  );

  res.status(200).json({
    success: true,
    data: { parameters },
  });
});

// @desc    Get performance trends
// @route   GET /api/adaptive/trends/:userId/:moduleName
// @access  Private
export const getPerformanceTrends = catchAsync(async (req, res, next) => {
  const { userId, moduleName } = req.params;
  const { days } = req.query;

  const trends = await adaptiveLearningService.analyzePerformanceTrends(
    userId,
    moduleName,
    parseInt(days) || 7,
  );

  res.status(200).json({
    success: true,
    data: { trends },
  });
});

// @desc    Assess concept mastery
// @route   GET /api/adaptive/mastery/:userId/:moduleName/:concept
// @access  Private
export const getConceptMastery = catchAsync(async (req, res, next) => {
  const { userId, moduleName, concept } = req.params;

  const mastery = await adaptiveLearningService.assessConceptMastery(
    userId,
    moduleName,
    concept,
  );

  res.status(200).json({
    success: true,
    data: { mastery },
  });
});
