# MathQuest Backend API

## Overview
Full-stack backend for MathQuest - An autism-friendly adaptive math learning platform.

## Features
- 🔐 JWT Authentication (Parent & Child roles)
- 📊 Progress Tracking with MongoDB
- 🧠 Adaptive Learning Engine
- 🌍 Learning Worlds System
- 📈 Performance Analytics
- 🎯 Personalized Recommendations

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT + bcrypt
- **Architecture**: REST API

## Installation

```bash
cd mathquest_Backend
npm install
```

## Environment Variables

Create a `.env` file:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
PORT=5000
CLIENT_URL=http://localhost:5173
BCRYPT_SALT_ROUNDS=12
NODE_ENV=development
```

## Running the Server

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Progress
- `GET /api/progress/:userId` - Get all progress
- `GET /api/progress/:userId/:moduleName` - Get module progress
- `POST /api/progress/update` - Update progress
- `GET /api/progress/analytics/:userId` - Get analytics
- `GET /api/progress/insights/:userId` - Get insights

### Performance
- `POST /api/performance/log` - Log performance data
- `GET /api/performance/:userId` - Get performance history
- `GET /api/performance/session/:sessionId` - Get session data

### Learning Worlds
- `GET /api/worlds/:userId` - Get all worlds
- `GET /api/worlds/:userId/:worldName` - Get specific world
- `POST /api/worlds/update` - Update world progress
- `GET /api/worlds/recommend/:userId` - Get recommended world

### Adaptive Learning
- `GET /api/adaptive/recommendation/:userId/:moduleName` - Get recommendations
- `GET /api/adaptive/parameters/:userId/:moduleName` - Get adaptive parameters
- `GET /api/adaptive/trends/:userId/:moduleName` - Get performance trends
- `GET /api/adaptive/mastery/:userId/:moduleName/:concept` - Get concept mastery

## Database Models

### User
- name, email, password (hashed)
- role (parent/child)
- linkedChildren, parentId
- preferences, age

### Progress
- userId, moduleName
- accuracy, masteryLevel
- completedSessions, totalQuestions
- strengths, weakAreas
- averageResponseTime

### PerformanceLog
- userId, moduleName, sessionId
- questionType, isCorrect
- responseTime, difficultyLevel
- conceptTags, timestamp

### LearningWorld
- userId, worldName
- unlocked, completionPercentage
- modules array with stars
- timestamps

## Adaptive Learning Logic

The system automatically adjusts:
- **Difficulty**: Based on 85% threshold (increase) and 60% threshold (decrease)
- **Hints**: More hints for accuracy < 70%
- **Guided Mode**: Enabled for accuracy < 60%
- **Focus Areas**: Identifies weak concepts

## Security
- Passwords hashed with bcrypt (12 rounds)
- JWT token authentication
- Role-based access control
- Protected routes
- Input validation

## License
MIT
