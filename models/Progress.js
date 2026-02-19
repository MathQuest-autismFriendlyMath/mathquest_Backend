import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  moduleName: {
    type: String,
    required: true,
    enum: [
      'number-recognition',
      'counting',
      'addition',
      'subtraction',
      'pattern-sequence',
      'visual-multiplication',
      'visual-fractions',
      'money',
      'time',
      'geometry',
    ],
  },
  accuracy: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  masteryLevel: {
    type: String,
    enum: ['beginner', 'developing', 'proficient', 'mastered'],
    default: 'beginner',
  },
  completedSessions: {
    type: Number,
    default: 0,
  },
  totalQuestions: {
    type: Number,
    default: 0,
  },
  correctAnswers: {
    type: Number,
    default: 0,
  },
  currentDifficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy',
  },
  strengths: [{
    concept: String,
    accuracy: Number,
  }],
  weakAreas: [{
    concept: String,
    accuracy: Number,
    attemptsCount: Number,
  }],
  averageResponseTime: {
    type: Number,
    default: 0,
  },
  lastSessionDate: Date,
  consecutiveDays: {
    type: Number,
    default: 0,
  },
  totalTimeSpent: {
    type: Number,
    default: 0, // in seconds
  },
  achievements: [{
    name: String,
    earnedAt: Date,
  }],
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound index for user and module
progressSchema.index({ userId: 1, moduleName: 1 }, { unique: true });

// Update mastery level based on accuracy
progressSchema.pre('save', function(next) {
  if (this.accuracy >= 90) {
    this.masteryLevel = 'mastered';
  } else if (this.accuracy >= 75) {
    this.masteryLevel = 'proficient';
  } else if (this.accuracy >= 50) {
    this.masteryLevel = 'developing';
  } else {
    this.masteryLevel = 'beginner';
  }
  
  this.lastUpdated = Date.now();
  next();
});

const Progress = mongoose.model('Progress', progressSchema);

export default Progress;
