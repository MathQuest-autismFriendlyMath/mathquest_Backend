import LearningWorld from "../models/LearningWorld.js";
import Progress from "../models/Progress.js";
import { catchAsync, AppError } from "../utils/errorHandler.js";

// World configuration
const WORLD_CONFIG = {
  "garden-world": {
    name: "Garden World",
    description: "Learn counting and multiplication in the garden",
    modules: ["counting", "visual-multiplication"],
    unlockRequirement: null, // Always unlocked
  },
  "store-world": {
    name: "Store World",
    description: "Practice money and shopping math",
    modules: ["money", "addition", "subtraction"],
    unlockRequirement: { world: "garden-world", completion: 50 },
  },
  "time-world": {
    name: "Time World",
    description: "Master time and schedules",
    modules: ["time"],
    unlockRequirement: { world: "garden-world", completion: 50 },
  },
  "pattern-world": {
    name: "Pattern World",
    description: "Discover patterns and sequences",
    modules: ["pattern-sequence"],
    unlockRequirement: { world: "store-world", completion: 60 },
  },
  "shape-world": {
    name: "Shape World",
    description: "Explore geometry and spatial thinking",
    modules: ["geometry"],
    unlockRequirement: { world: "pattern-world", completion: 60 },
  },
};

// @desc    Get all worlds for user
// @route   GET /api/worlds/:userId
// @access  Private
export const getUserWorlds = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  const worlds = await LearningWorld.find({ userId });

  // Initialize worlds if none exist
  if (worlds.length === 0) {
    const gardenWorld = await LearningWorld.create({
      userId,
      worldName: "garden-world",
      unlocked: true,
      modules: WORLD_CONFIG["garden-world"].modules.map((m) => ({
        moduleName: m,
        completed: false,
        stars: 0,
      })),
    });

    // Create other worlds (locked)
    const otherWorlds = [
      "store-world",
      "time-world",
      "pattern-world",
      "shape-world",
    ];
    for (const worldName of otherWorlds) {
      await LearningWorld.create({
        userId,
        worldName,
        unlocked: false,
        modules: WORLD_CONFIG[worldName].modules.map((m) => ({
          moduleName: m,
          completed: false,
          stars: 0,
        })),
      });
    }

    const allWorlds = await LearningWorld.find({ userId });
    return res.status(200).json({
      success: true,
      data: { worlds: allWorlds },
    });
  }

  // Check and update unlock status
  for (const world of worlds) {
    if (!world.unlocked) {
      const config = WORLD_CONFIG[world.worldName];
      if (config.unlockRequirement) {
        const requiredWorld = await LearningWorld.findOne({
          userId,
          worldName: config.unlockRequirement.world,
        });

        if (
          requiredWorld &&
          requiredWorld.completionPercentage >=
            config.unlockRequirement.completion
        ) {
          world.unlocked = true;
          world.firstUnlockedAt = Date.now();
          await world.save();
        }
      }
    }
  }

  const worldsWithConfig = worlds.map((w) => ({
    ...w.toObject(),
    config: WORLD_CONFIG[w.worldName],
  }));

  res.status(200).json({
    success: true,
    data: { worlds: worldsWithConfig },
  });
});

// @desc    Get specific world
// @route   GET /api/worlds/:userId/:worldName
// @access  Private
export const getWorld = catchAsync(async (req, res, next) => {
  const { userId, worldName } = req.params;

  const world = await LearningWorld.findOne({ userId, worldName });

  if (!world) {
    return next(new AppError("World not found", 404));
  }

  res.status(200).json({
    success: true,
    data: {
      world: {
        ...world.toObject(),
        config: WORLD_CONFIG[worldName],
      },
    },
  });
});

// @desc    Update world progress
// @route   POST /api/worlds/update
// @access  Private
export const updateWorldProgress = catchAsync(async (req, res, next) => {
  const { userId, worldName, moduleName, stars } = req.body;

  const world = await LearningWorld.findOne({ userId, worldName });

  if (!world) {
    return next(new AppError("World not found", 404));
  }

  if (!world.unlocked) {
    return next(new AppError("World is locked", 403));
  }

  // Update module in world
  const moduleIndex = world.modules.findIndex(
    (m) => m.moduleName === moduleName,
  );

  if (moduleIndex === -1) {
    return next(new AppError("Module not found in this world", 404));
  }

  world.modules[moduleIndex].completed = true;
  world.modules[moduleIndex].stars = Math.max(
    world.modules[moduleIndex].stars,
    stars || 0,
  );
  world.lastAccessedAt = Date.now();

  await world.save();

  res.status(200).json({
    success: true,
    message: "World progress updated",
    data: { world },
  });
});

// @desc    Get recommended next world
// @route   GET /api/worlds/recommend/:userId
// @access  Private
export const getRecommendedWorld = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  const worlds = await LearningWorld.find({ userId });
  const progress = await Progress.find({ userId });

  // Find current active world (unlocked and not complete)
  const activeWorld = worlds.find(
    (w) => w.unlocked && w.completionPercentage < 100,
  );

  if (!activeWorld) {
    return res.status(200).json({
      success: true,
      data: {
        recommendation: null,
        message: "All worlds completed! Great job!",
      },
    });
  }

  // Find next module to focus on
  const incompleteModule = activeWorld.modules.find((m) => !m.completed);

  let focusModule = null;
  if (incompleteModule) {
    const moduleProgress = progress.find(
      (p) => p.moduleName === incompleteModule.moduleName,
    );
    focusModule = {
      moduleName: incompleteModule.moduleName,
      currentAccuracy: moduleProgress?.accuracy || 0,
      masteryLevel: moduleProgress?.masteryLevel || "beginner",
    };
  }

  res.status(200).json({
    success: true,
    data: {
      recommendation: {
        world: activeWorld.worldName,
        worldCompletion: activeWorld.completionPercentage,
        focusModule,
      },
    },
  });
});
