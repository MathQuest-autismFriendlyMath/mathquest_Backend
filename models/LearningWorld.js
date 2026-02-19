import mongoose from 'mongoose';

const learningWorldSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  worldName: {
    type: String,
    required: true,
    enum: ['garden-world', 'store-world', 'time-world', 'pattern-world', 'shape-world'],
  },
  unlocked: {
    type: Boolean,
    default: false,
  },
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  modules: [{
    moduleName: String,
    completed: Boolean,
    stars: {
      type: Number,
      min: 0,
      max: 3,
    },
  }],
  totalStars: {
    type: Number,
    default: 0,
  },
  firstUnlockedAt: Date,
  lastAccessedAt: Date,
  completedAt: Date,
}, {
  timestamps: true,
});

// Compound index
learningWorldSchema.index({ userId: 1, worldName: 1 }, { unique: true });

// Calculate completion percentage before saving
learningWorldSchema.pre('save', function(next) {
  if (this.modules.length > 0) {
    const completedModules = this.modules.filter(m => m.completed).length;
    this.completionPercentage = Math.round((completedModules / this.modules.length) * 100);
    
    // Calculate total stars
    this.totalStars = this.modules.reduce((sum, m) => sum + (m.stars || 0), 0);
    
    // Mark as completed if all modules are done
    if (this.completionPercentage === 100 && !this.completedAt) {
      this.completedAt = Date.now();
    }
  }
  next();
});

const LearningWorld = mongoose.model('LearningWorld', learningWorldSchema);

export default LearningWorld;
