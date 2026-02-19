import mongoose from "mongoose";

const interactionEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    moduleName: {
      type: String,
      required: true,
      enum: [
        "NumberRecognition",
        "Counting",
        "Addition",
        "Subtraction",
        "PatternSequence",
        "VisualMultiplication",
        "MoneyMath",
        "TimeTelling",
        "SchedulePlanning",
        "WordProblems",
      ],
    },
    questionId: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        "question_displayed",
        "mouse_move",
        "mouse_hover",
        "mouse_click",
        "key_down",
        "key_up",
        "choice_hover_start",
        "choice_hover_end",
        "answer_selected",
        "hint_requested",
        "visual_focus",
        "idle_detected",
        "input_start",
        "input_end",
      ],
    },
    eventData: {
      // Flexible object to store event-specific data
      targetElement: String,
      targetValue: mongoose.Schema.Types.Mixed,
      mousePosition: {
        x: Number,
        y: Number,
      },
      keyCode: String,
      hoverDuration: Number, // milliseconds
      reactionTime: Number, // milliseconds from question display
      timestamp: Number, // epoch milliseconds
      elementId: String,
      choiceIndex: Number,
      isCorrect: Boolean,
      metadata: mongoose.Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient querying
interactionEventSchema.index({ userId: 1, sessionId: 1, timestamp: 1 });
interactionEventSchema.index({ userId: 1, moduleName: 1, timestamp: -1 });

// Static method to get session events
interactionEventSchema.statics.getSessionEvents = function (userId, sessionId) {
  return this.find({ userId, sessionId }).sort({ timestamp: 1 });
};

// Static method to get user interaction patterns
interactionEventSchema.statics.getUserPatterns = async function (
  userId,
  moduleName,
  limit = 100,
) {
  return this.find({ userId, moduleName }).sort({ timestamp: -1 }).limit(limit);
};

// Static method to calculate engagement metrics
interactionEventSchema.statics.calculateEngagementMetrics = async function (
  userId,
  sessionId,
) {
  const events = await this.find({ userId, sessionId }).sort({ timestamp: 1 });

  if (events.length === 0) {
    return null;
  }

  const metrics = {
    totalEvents: events.length,
    totalDuration: 0,
    averageReactionTime: 0,
    hoverPatterns: {},
    hesitationCount: 0,
    rapidResponseCount: 0,
    idleCount: 0,
    mouseMovementCount: 0,
    keyboardInteractionCount: 0,
  };

  let reactionTimes = [];
  let hoveredChoices = new Map();
  let questionStartTime = null;

  events.forEach((event) => {
    // Track event types
    if (event.eventType === "mouse_move") metrics.mouseMovementCount++;
    if (event.eventType === "key_down" || event.eventType === "key_up")
      metrics.keyboardInteractionCount++;
    if (event.eventType === "idle_detected") metrics.idleCount++;

    // Track question-answer flow
    if (event.eventType === "question_displayed") {
      questionStartTime = event.timestamp;
    }

    if (event.eventType === "answer_selected" && questionStartTime) {
      const reactionTime = event.timestamp - questionStartTime;
      reactionTimes.push(reactionTime);

      // Classify response speed
      if (reactionTime < 2000) metrics.rapidResponseCount++;
      if (reactionTime > 8000) metrics.hesitationCount++;

      questionStartTime = null;
    }

    // Track hover patterns
    if (
      event.eventType === "choice_hover_start" &&
      event.eventData?.choiceIndex !== undefined
    ) {
      const choiceKey = `choice_${event.eventData.choiceIndex}`;
      if (!hoveredChoices.has(choiceKey)) {
        hoveredChoices.set(choiceKey, { count: 0, totalDuration: 0 });
      }
      hoveredChoices.get(choiceKey).startTime = event.timestamp;
    }

    if (
      event.eventType === "choice_hover_end" &&
      event.eventData?.choiceIndex !== undefined
    ) {
      const choiceKey = `choice_${event.eventData.choiceIndex}`;
      if (
        hoveredChoices.has(choiceKey) &&
        hoveredChoices.get(choiceKey).startTime
      ) {
        const duration =
          event.timestamp - hoveredChoices.get(choiceKey).startTime;
        hoveredChoices.get(choiceKey).count++;
        hoveredChoices.get(choiceKey).totalDuration += duration;
        delete hoveredChoices.get(choiceKey).startTime;
      }
    }
  });

  // Calculate averages
  if (reactionTimes.length > 0) {
    metrics.averageReactionTime =
      reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
  }

  // Convert hover map to object
  hoveredChoices.forEach((value, key) => {
    metrics.hoverPatterns[key] = {
      hoverCount: value.count,
      averageHoverDuration:
        value.count > 0 ? value.totalDuration / value.count : 0,
    };
  });

  // Calculate total session duration
  if (events.length > 1) {
    metrics.totalDuration =
      events[events.length - 1].timestamp - events[0].timestamp;
  }

  return metrics;
};

const InteractionEvent = mongoose.model(
  "InteractionEvent",
  interactionEventSchema,
);

export default InteractionEvent;
