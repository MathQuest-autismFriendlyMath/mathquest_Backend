import InteractionEvent from "../models/InteractionEvent.js";
import { catchAsync } from "../utils/errorHandler.js";

// @desc    Log interaction event
// @route   POST /api/interactions/event
// @access  Private
export const logInteractionEvent = catchAsync(async (req, res) => {
  const { sessionId, moduleName, questionId, eventType, eventData } = req.body;

  const event = await InteractionEvent.create({
    userId: req.user._id,
    sessionId,
    moduleName,
    questionId,
    eventType,
    eventData,
  });

  res.status(201).json({
    success: true,
    data: event,
  });
});

// @desc    Log batch of interaction events
// @route   POST /api/interactions/events/batch
// @access  Private
export const logInteractionEventsBatch = catchAsync(async (req, res) => {
  const { events } = req.body;

  if (!Array.isArray(events) || events.length === 0) {
    res.status(400);
    throw new Error("Events array is required");
  }

  // Add userId to all events
  const eventsWithUser = events.map((event) => ({
    ...event,
    userId: req.user._id,
  }));

  const savedEvents = await InteractionEvent.insertMany(eventsWithUser);

  res.status(201).json({
    success: true,
    count: savedEvents.length,
    data: savedEvents,
  });
});

// @desc    Get session events
// @route   GET /api/interactions/session/:sessionId
// @access  Private
export const getSessionEvents = catchAsync(async (req, res) => {
  const { sessionId } = req.params;

  const events = await InteractionEvent.getSessionEvents(
    req.user._id,
    sessionId,
  );

  res.json({
    success: true,
    count: events.length,
    data: events,
  });
});

// @desc    Get engagement metrics for a session
// @route   GET /api/interactions/session/:sessionId/metrics
// @access  Private
export const getSessionMetrics = catchAsync(async (req, res) => {
  const { sessionId } = req.params;

  const metrics = await InteractionEvent.calculateEngagementMetrics(
    req.user._id,
    sessionId,
  );

  if (!metrics) {
    res.status(404);
    throw new Error("No interaction data found for this session");
  }

  res.json({
    success: true,
    data: metrics,
  });
});

// @desc    Get user interaction patterns
// @route   GET /api/interactions/patterns
// @access  Private
export const getUserInteractionPatterns = catchAsync(async (req, res) => {
  const { moduleName, limit = 100 } = req.query;

  const patterns = await InteractionEvent.getUserPatterns(
    req.user._id,
    moduleName,
    parseInt(limit),
  );

  // Analyze patterns for insights
  const analysis = analyzeInteractionPatterns(patterns);

  res.json({
    success: true,
    count: patterns.length,
    data: {
      events: patterns,
      analysis,
    },
  });
});

// @desc    Get real-time adaptive recommendations
// @route   POST /api/interactions/adaptive-feedback
// @access  Private
export const getAdaptiveFeedback = catchAsync(async (req, res) => {
  const { sessionId, currentQuestionId, recentEvents } = req.body;

  // Analyze recent events for patterns indicating need for support
  const feedback = await generateAdaptiveFeedback(
    recentEvents,
    req.user._id,
    sessionId,
  );

  res.json({
    success: true,
    data: feedback,
  });
});

// Helper function to analyze interaction patterns
function analyzeInteractionPatterns(events) {
  if (!events || events.length === 0) {
    return {
      engagementLevel: "unknown",
      hesitationTendency: "unknown",
      preferredInteractionMode: "unknown",
    };
  }

  const eventTypes = {};
  let totalHesitation = 0;
  let totalRapid = 0;
  let mouseInteractions = 0;
  let keyboardInteractions = 0;

  events.forEach((event) => {
    eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;

    if (
      event.eventType === "mouse_move" ||
      event.eventType === "mouse_hover" ||
      event.eventType === "mouse_click"
    ) {
      mouseInteractions++;
    }
    if (event.eventType === "key_down" || event.eventType === "key_up") {
      keyboardInteractions++;
    }

    if (event.eventData?.reactionTime) {
      if (event.eventData.reactionTime > 8000) totalHesitation++;
      if (event.eventData.reactionTime < 2000) totalRapid++;
    }
  });

  const engagementLevel =
    events.length > 200 ? "high" : events.length > 100 ? "medium" : "low";

  const hesitationTendency =
    totalHesitation > totalRapid
      ? "high"
      : totalHesitation < totalRapid
        ? "low"
        : "medium";

  const preferredInteractionMode =
    mouseInteractions > keyboardInteractions
      ? "mouse"
      : keyboardInteractions > mouseInteractions
        ? "keyboard"
        : "mixed";

  return {
    engagementLevel,
    hesitationTendency,
    preferredInteractionMode,
    eventTypeCounts: eventTypes,
    hesitationCount: totalHesitation,
    rapidResponseCount: totalRapid,
  };
}

// Helper function to generate adaptive feedback
async function generateAdaptiveFeedback(recentEvents, userId, sessionId) {
  if (!recentEvents || recentEvents.length === 0) {
    return {
      shouldProvideHint: false,
      shouldSimplify: false,
      shouldEncourage: false,
      recommendedAction: "continue",
    };
  }

  const feedback = {
    shouldProvideHint: false,
    shouldSimplify: false,
    shouldEncourage: false,
    shouldHighlightVisual: false,
    shouldPlayAudioCue: false,
    recommendedAction: "continue",
    message: null,
  };

  // Analyze recent events
  let idleTime = 0;
  let hoverRepeats = {};
  let lastQuestionTime = null;

  recentEvents.forEach((event) => {
    if (event.eventType === "question_displayed") {
      lastQuestionTime = event.eventData?.timestamp || Date.now();
    }

    if (event.eventType === "idle_detected") {
      idleTime += event.eventData?.duration || 0;
    }

    if (event.eventType === "choice_hover_start") {
      const choiceId = event.eventData?.choiceIndex;
      hoverRepeats[choiceId] = (hoverRepeats[choiceId] || 0) + 1;
    }
  });

  // Rule: Long idle time → encourage
  if (idleTime > 10000) {
    feedback.shouldEncourage = true;
    feedback.shouldPlayAudioCue = true;
    feedback.recommendedAction = "prompt";
    feedback.message = "Take your time! Try selecting an answer.";
  }

  // Rule: Repeated hover on wrong answer → provide visual cue
  const maxHovers = Math.max(...Object.values(hoverRepeats), 0);
  if (maxHovers > 3) {
    feedback.shouldHighlightVisual = true;
    feedback.recommendedAction = "visualCue";
    feedback.message = "Let me highlight the important parts for you.";
  }

  // Rule: Long reaction time → provide hint
  if (lastQuestionTime && Date.now() - lastQuestionTime > 15000) {
    feedback.shouldProvideHint = true;
    feedback.recommendedAction = "hint";
    feedback.message = "Would you like a hint?";
  }

  return feedback;
}
