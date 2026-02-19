import Progress from "../models/Progress.js";
import PerformanceLog from "../models/PerformanceLog.js";
import InteractionEvent from "../models/InteractionEvent.js";
import { ADAPTIVE_RULES, DIFFICULTY_LEVELS } from "../config/constants.js";

class AdaptiveLearningService {
  /**
   * Calculate recommended difficulty based on performance
   */
  async calculateDifficulty(userId, moduleName) {
    const progress = await Progress.findOne({ userId, moduleName });

    if (
      !progress ||
      progress.completedSessions < ADAPTIVE_RULES.MIN_SESSIONS_FOR_ADJUSTMENT
    ) {
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
      focusAreas: progress.weakAreas.slice(0, 3).map((w) => w.concept),
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
      return { trend: "insufficient-data", improvement: null };
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
      trend = "improving";
    } else if (improvement < -10) {
      trend = "declining";
    } else {
      trend = "stable";
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
    })
      .limit(20)
      .sort({ timestamp: -1 });

    if (logs.length < 3) {
      return { mastered: false, confidence: "low", attempts: logs.length };
    }

    const accuracy = this._calculateAccuracy(logs);
    const avgResponseTime =
      logs.reduce((sum, l) => sum + l.responseTime, 0) / logs.length;

    return {
      mastered: accuracy >= 85 && logs.length >= 5,
      accuracy,
      avgResponseTime,
      attempts: logs.length,
      confidence: accuracy >= 85 ? "high" : accuracy >= 70 ? "medium" : "low",
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
      timeLimit:
        progress.averageResponseTime > 10000
          ? null
          : progress.averageResponseTime * 2,
      hintsAvailable:
        progress.accuracy < 70 ? 3 : progress.accuracy < 85 ? 2 : 1,
      visualAidsEnabled: progress.masteryLevel !== "mastered",
      guidedModeEnabled: progress.accuracy < 60,
      weakAreasToFocus: progress.weakAreas.slice(0, 2).map((w) => w.concept),
    };

    return params;
  }

  /**
   * Private helper methods
   */
  _calculateAccuracy(logs) {
    const correct = logs.filter((l) => l.isCorrect).length;
    return Math.round((correct / logs.length) * 100);
  }

  _getEncouragementLevel(accuracy) {
    if (accuracy < 50) return "high";
    if (accuracy < 75) return "medium";
    return "standard";
  }

  _getSuggestedAction(trend, accuracy) {
    if (trend === "declining" || accuracy < 50) {
      return "Reduce difficulty and enable guided mode";
    }
    if (trend === "improving" && accuracy > 85) {
      return "Consider increasing difficulty level";
    }
    return "Continue with current difficulty";
  }

  _getQuestionCount(masteryLevel) {
    switch (masteryLevel) {
      case "beginner":
        return 5;
      case "developing":
        return 7;
      case "proficient":
        return 10;
      case "mastered":
        return 10;
      default:
        return 5;
    }
  }

  /**
   * Analyze interaction patterns to understand learning behaviors
   */
  async analyzeInteractionBehavior(userId, moduleName, sessionId = null) {
    const query = sessionId 
      ? { userId, moduleName, sessionId }
      : { userId, moduleName };
    
    const recentInteractions = await InteractionEvent.find(query)
      .sort({ timestamp: -1 })
      .limit(500);

    if (recentInteractions.length === 0) {
      return {
        engagementScore: 0,
        hesitationScore: 0,
        confidenceScore: 0,
        preferredLearningMode: 'visual',
        needsSupport: false
      };
    }

    // Calculate engagement score (based on interaction frequency and diversity)
    const engagementScore = this._calculateEngagementScore(recentInteractions);
    
    // Calculate hesitation score (based on hover patterns, reaction times)
    const hesitationScore = this._calculateHesitationScore(recentInteractions);
    
    // Calculate confidence score (based on response speed and accuracy correlation)
    const confidenceScore = this._calculateConfidenceScore(recentInteractions);
    
    // Determine preferred learning mode
    const preferredLearningMode = this._determinePreferredLearningMode(recentInteractions);

    return {
      engagementScore,
      hesitationScore,
      confidenceScore,
      preferredLearningMode,
      needsSupport: hesitationScore > 0.6 || confidenceScore < 0.4,
      recommendedScaffolding: this._recommendScaffolding(hesitationScore, confidenceScore)
    };
  }

  /**
   * Get comprehensive adaptive feedback based on both performance and interaction
   */
  async getComprehensiveAdaptiveFeedback(userId, moduleName, sessionId) {
    const [performanceTrends, interactionBehavior, recommendations] = await Promise.all([
      this.analyzePerformanceTrends(userId, moduleName),
      this.analyzeInteractionBehavior(userId, moduleName, sessionId),
      this.getRecommendations(userId, moduleName)
    ]);

    // Combine insights from all sources
    const feedback = {
      ...recommendations,
      performanceTrend: performanceTrends.trend,
      engagementLevel: this._getEngagementLevel(interactionBehavior.engagementScore),
      confidenceLevel: this._getConfidenceLevel(interactionBehavior.confidenceScore),
      needsEncouragement: interactionBehavior.hesitationScore > 0.7,
      needsVisualSupport: interactionBehavior.preferredLearningMode === 'visual',
      recommendedHintType: this._recommendHintType(interactionBehavior),
      paceAdjustment: this._recommendPaceAdjustment(interactionBehavior, performanceTrends)
    };

    return feedback;
  }

  /**
   * Private helper methods for interaction analysis
   */
  _calculateEngagementScore(interactions) {
    // Higher score = more engaged (more interactions, diverse types)
    const uniqueEventTypes = new Set(interactions.map(i => i.eventType)).size;
    const interactionRate = interactions.length / 100; // normalize
    
    return Math.min(1, (uniqueEventTypes / 10) * 0.5 + interactionRate * 0.5);
  }

  _calculateHesitationScore(interactions) {
    // Higher score = more hesitation (long hover times, idle periods)
    let hesitationIndicators = 0;
    let totalEvents = 0;

    interactions.forEach(event => {
      totalEvents++;
      
      if (event.eventType === 'idle_detected') hesitationIndicators += 2;
      if (event.eventType === 'choice_hover_start' && event.eventData?.hoverDuration > 3000) {
        hesitationIndicators += 1;
      }
      if (event.eventData?.reactionTime > 10000) hesitationIndicators += 1.5;
    });

    return totalEvents > 0 ? Math.min(1, hesitationIndicators / totalEvents) : 0;
  }

  _calculateConfidenceScore(interactions) {
    // Higher score = more confident (quick responses, fewer hovers on choices)
    let confidenceIndicators = 0;
    let totalDecisionPoints = 0;

    interactions.forEach(event => {
      if (event.eventType === 'answer_selected') {
        totalDecisionPoints++;
        
        if (event.eventData?.reactionTime < 5000) confidenceIndicators += 1;
        if (event.eventData?.isCorrect) confidenceIndicators += 0.5;
      }
    });

    return totalDecisionPoints > 0 ? confidenceIndicators / (totalDecisionPoints * 1.5) : 0.5;
  }

  _determinePreferredLearningMode(interactions) {
    let mouseInteractions = 0;
    let keyboardInteractions = 0;
    
    interactions.forEach(event => {
      if (['mouse_move', 'mouse_hover', 'mouse_click'].includes(event.eventType)) {
        mouseInteractions++;
      }
      if (['key_down', 'key_up'].includes(event.eventType)) {
        keyboardInteractions++;
      }
    });

    return mouseInteractions > keyboardInteractions * 1.5 ? 'visual' : 
           keyboardInteractions > mouseInteractions * 1.5 ? 'auditory' : 'multimodal';
  }

  _recommendScaffolding(hesitationScore, confidenceScore) {
    if (hesitationScore > 0.7) {
      return ['step-by-step-guidance', 'visual-hints', 'audio-encouragement'];
    }
    if (confidenceScore < 0.3) {
      return ['simplified-problems', 'worked-examples', 'frequent-feedback'];
    }
    if (hesitationScore > 0.5 || confidenceScore < 0.5) {
      return ['visual-hints', 'occasional-prompts'];
    }
    return ['minimal-guidance'];
  }

  _getEngagementLevel(score) {
    if (score > 0.7) return 'high';
    if (score > 0.4) return 'medium';
    return 'low';
  }

  _getConfidenceLevel(score) {
    if (score > 0.7) return 'high';
    if (score > 0.4) return 'medium';
    return 'low';
  }

  _recommendHintType(interactionBehavior) {
    if (interactionBehavior.preferredLearningMode === 'visual') {
      return 'visual-diagram';
    }
    if (interactionBehavior.hesitationScore > 0.6) {
      return 'step-by-step';
    }
    return 'text-hint';
  }

  _recommendPaceAdjustment(interactionBehavior, performanceTrends) {
    if (interactionBehavior.hesitationScore > 0.7) {
      return 'slower';
    }
    if (performanceTrends.trend === 'improving' && interactionBehavior.confidenceScore > 0.7) {
      return 'faster';
    }
    return 'maintain';
  }
}

export default new AdaptiveLearningService();
