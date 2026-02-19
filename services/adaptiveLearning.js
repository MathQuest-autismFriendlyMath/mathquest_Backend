import Progress from '../models/Progress.js';
import PerformanceLog from '../models/PerformanceLog.js';
import { ADAPTIVE_RULES, DIFFICULTY_LEVELS } from '../config/constants.js';

class AdaptiveLearningService {
  /**
   * Calculate recommended difficulty based on performance
   */
  async calculateDifficulty(userId, moduleName) {
    const progress = await Progress.findOne({ userId, moduleName });

    if (!progress || progress.completedSessions < ADAPTIVE_RULES.MIN_SESSIONS_FOR_ADJUSTMENT) {
      return DIFFICULTY_LEVELS.EASY;
    }

    const { accuracy, currentDifficulty } = progress;

    // Increase difficulty if performing well
    if (accuracy >= ADAPTIVE_RULES.INCREASE_DIFFICULTY_THRESHOLD) {
      if (currentDifficulty === DIFFICULTY_LEVELS.EASY) {
        return DIFFICULTY_LEVELS.MEDIUM;
      } else if (currentDifficulty === DIFFICULTY_LEVELS.MEDIUM) {
        return DIFFICULTY_LEVELS.HARD;
      }
    }

    // Decrease difficulty if struggling
    if (accuracy < ADAPTIVE_RULES.DECREASE_DIFFICULTY_THRESHOLD) {
      if (currentDifficulty === DIFFICULTY_LEVELS.HARD) {
        return DIFFICULTY_LEVELS.MEDIUM;
      } else if (currentDifficulty === DIFFICULTY_LEVELS.MEDIUM) {
        return DIFFICULTY_LEVELS.EASY;
      }
    }

    return currentDifficulty;
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(userId, moduleName) {
    const progress = await Progress.findOne({ userId, moduleName });

    if (!progress) {
      return {
        difficulty: DIFFICULTY_LEVELS.EASY,
        hintsEnabled: true,
        guidedMode: true,
        focusAreas: [],
      };
    }

    const recommendations = {
      difficulty: await this.calculateDifficulty(userId, moduleName),
      hintsEnabled: progress.accuracy < 70,
      guidedMode: progress.accuracy < 60,
      focusAreas: progress.weakAreas.slice(0, 3).map(w => w.concept),
      encouragementLevel: this._getEncouragementLevel(progress.accuracy),
    };

    return recommendations;
  }

  /**
   * Analyze recent performance trends
   */
  async analyzePerformanceTrends(userId, moduleName, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const recentLogs = await PerformanceLog.find({
      userId,
      moduleName,
      timestamp: { $gte: startDate },
    }).sort({ timestamp: 1 });

    if (recentLogs.length < 5) {
      return { trend: 'insufficient-data', improvement: null };
    }

    // Split into two halves and compare
    const midPoint = Math.floor(recentLogs.length / 2);
    const firstHalf = recentLogs.slice(0, midPoint);
    const secondHalf = recentLogs.slice(midPoint);

    const firstHalfAccuracy = this._calculateAccuracy(firstHalf);
    const secondHalfAccuracy = this._calculateAccuracy(secondHalf);

    const improvement = secondHalfAccuracy - firstHalfAccuracy;

    let trend;
    if (improvement > 10) {
      trend = 'improving';
    } else if (improvement < -10) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    return {
      trend,
      improvement,
      recentAccuracy: secondHalfAccuracy,
      suggestedAction: this._getSuggestedAction(trend, secondHalfAccuracy),
    };
  }

  /**
   * Determine concept mastery
   */
  async assessConceptMastery(userId, moduleName, concept) {
    const logs = await PerformanceLog.find({
      userId,
      moduleName,
      conceptTags: concept,
    }).limit(20).sort({ timestamp: -1 });

    if (logs.length < 3) {
      return { mastered: false, confidence: 'low', attempts: logs.length };
    }

    const accuracy = this._calculateAccuracy(logs);
    const avgResponseTime = logs.reduce((sum, l) => sum + l.responseTime, 0) / logs.length;

    return {
      mastered: accuracy >= 85 && logs.length >= 5,
      accuracy,
      avgResponseTime,
      attempts: logs.length,
      confidence: accuracy >= 85 ? 'high' : accuracy >= 70 ? 'medium' : 'low',
    };
  }

  /**
   * Get adaptive question parameters
   */
  async getAdaptiveParameters(userId, moduleName) {
    const progress = await Progress.findOne({ userId, moduleName });
    const trends = await this.analyzePerformanceTrends(userId, moduleName);

    // Default parameters for new users
    if (!progress) {
      return {
        difficulty: DIFFICULTY_LEVELS.EASY,
        numberOfQuestions: 5,
        timeLimit: null,
        hintsAvailable: 3,
        visualAidsEnabled: true,
        guidedModeEnabled: true,
      };
    }

    // Adaptive parameters based on performance
    const params = {
      difficulty: await this.calculateDifficulty(userId, moduleName),
      numberOfQuestions: this._getQuestionCount(progress.masteryLevel),
      timeLimit: progress.averageResponseTime > 10000 ? null : progress.averageResponseTime * 2,
      hintsAvailable: progress.accuracy < 70 ? 3 : progress.accuracy < 85 ? 2 : 1,
      visualAidsEnabled: progress.masteryLevel !== 'mastered',
      guidedModeEnabled: progress.accuracy < 60,
      weakAreasToFocus: progress.weakAreas.slice(0, 2).map(w => w.concept),
    };

    return params;
  }

  /**
   * Private helper methods
   */
  _calculateAccuracy(logs) {
    const correct = logs.filter(l => l.isCorrect).length;
    return Math.round((correct / logs.length) * 100);
  }

  _getEncouragementLevel(accuracy) {
    if (accuracy < 50) return 'high';
    if (accuracy < 75) return 'medium';
    return 'standard';
  }

  _getSuggestedAction(trend, accuracy) {
    if (trend === 'declining' || accuracy < 50) {
      return 'Reduce difficulty and enable guided mode';
    }
    if (trend === 'improving' && accuracy > 85) {
      return 'Consider increasing difficulty level';
    }
    return 'Continue with current difficulty';
  }

  _getQuestionCount(masteryLevel) {
    switch (masteryLevel) {
      case 'beginner': return 5;
      case 'developing': return 7;
      case 'proficient': return 10;
      case 'mastered': return 10;
      default: return 5;
    }
  }
}

export default new AdaptiveLearningService();
