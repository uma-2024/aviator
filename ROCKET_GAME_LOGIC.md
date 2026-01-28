# 🚀 Rocket Crash Game - Complete Logic Documentation

## 📋 Table of Contents
1. [Random Crash Point Generation](#1-random-crash-point-generation)
2. [Rocket Flight Logic](#2-rocket-flight-logic)
3. [Rocket Position Calculation](#3-rocket-position-calculation)
4. [Complete Game Flow](#4-complete-game-flow)
5. [Code Implementation](#5-code-implementation)

---

## 1. Random Crash Point Generation

### 🎲 Simple Logic
The crash point is a random number between **1.1x** and **10.0x** that determines when the rocket will crash.

```javascript
// Generate random crash point
const MIN_CRASH = 1.1;  // Minimum multiplier (rocket crashes at least at 1.1x)
const MAX_CRASH = 10.0;  // Maximum multiplier (rocket can go up to 10.0x)

// Formula: random number between MIN and MAX
const crashPoint = parseFloat((MIN_CRASH + Math.random() * (MAX_CRASH - MIN_CRASH)).toFixed(2));

// Example outputs:
// crashPoint = 1.1 + (0.0 to 8.9) = 1.1 to 10.0
// crashPoint = 1.1 + (0.5 * 8.9) = 1.1 + 4.45 = 5.55x
// crashPoint = 1.1 + (0.9 * 8.9) = 1.1 + 8.01 = 9.11x
```

### 📊 Probability Distribution
- **Low multipliers (1.1x - 2.0x)**: More common (higher probability)
- **Medium multipliers (2.0x - 5.0x)**: Moderate probability
- **High multipliers (5.0x - 10.0x)**: Less common (lower probability)

**Note**: Using `Math.random()` gives uniform distribution. For weighted distribution (more low values), use:
```javascript
// Weighted random (more low values)
const random = Math.random();
const weightedRandom = random * random; // Square it to favor lower values
const crashPoint = parseFloat((MIN_CRASH + weightedRandom * (MAX_CRASH - MIN_CRASH)).toFixed(2));
```

---

## 2. Rocket Flight Logic

### 🚀 Multiplier Progression
The rocket starts at **1.0x** and increases smoothly until it reaches the crash point.

#### **Simple Linear Speed**
```javascript
// Constants
const START_MULTIPLIER = 1.0;
const SPEED = 0.09; // Multiplier increase per frame (normalized to 60fps)

// Game loop (runs at 60fps using requestAnimationFrame)
const gameLoop = () => {
  const now = performance.now();
  const deltaTime = now - (lastUpdateTime || now);
  lastUpdateTime = now;
  
  // Increase multiplier linearly
  currentMultiplier += SPEED * (deltaTime / 16.67); // Normalize to 60fps
  
  // Check if crashed
  if (currentMultiplier >= crashPoint) {
    // CRASH! Stop the game
    handleCrash(crashPoint);
    return;
  }
  
  // Update display
  updateRocketPosition(currentMultiplier);
  
  // Continue loop
  requestAnimationFrame(gameLoop);
};
```

#### **Speed Explanation**
- `SPEED = 0.09` means multiplier increases by **0.09x** per frame (at 60fps)
- In 1 second (60 frames): `0.09 * 60 = 5.4x` increase
- To reach 5.0x from 1.0x: `(5.0 - 1.0) / 0.09 = 44.4 frames ≈ 0.74 seconds`

**Adjust speed:**
- `SPEED = 0.05` → Slower (takes longer to reach high multipliers)
- `SPEED = 0.15` → Faster (reaches high multipliers quickly)

---

## 3. Rocket Position Calculation

### 📐 Graph Coordinates
```
SVG ViewBox: 400 x 300
Graph Area:
  - Start X: 40 (left edge)
  - End X: 380 (right edge)
  - Start Y: 20 (top edge)
  - End Y: 280 (bottom edge, X-axis position)
```

### 🎯 Rocket X Position (Horizontal Movement)
Rocket moves from left to right in a **curved path**.

```javascript
// Constants
const graphStartX = 40;   // Left edge
const graphEndX = 380;    // Right edge
const axisX = graphStartX; // Starting X position
const maxXDistance = graphEndX - graphStartX - 20; // Available width: 320px

// Calculate X position
const maxMultiplier = 10.0;
const normalizedMultiplier = (currentMultiplier - 1.0) / (maxMultiplier - 1.0); // 0.0 to 1.0

// Curved path: mix of linear (30%) and quadratic (70%)
const xProgress = normalizedMultiplier;
const linearFactor = xProgress;           // Linear component
const curveFactor = xProgress * xProgress; // Quadratic component (curve)
const curvedProgress = linearFactor * 0.3 + curveFactor * 0.7; // Blend them

// Final X position
const rocketX = axisX + (curvedProgress * maxXDistance * 0.9);
```

**Explanation:**
- `normalizedMultiplier`: Converts 1.0-10.0x range to 0.0-1.0 range
- `curvedProgress`: Creates smooth curve (starts slow, accelerates)
- `rocketX`: Final X coordinate (40 to ~362)

### 🎯 Rocket Y Position (Vertical Movement)
Rocket moves upward in a **parabolic path** (positive upward parabola).

```javascript
// Constants
const graphStartY = 20;   // Top edge
const graphEndY = 280;    // Bottom edge (X-axis)
const axisY = graphEndY;  // Starting Y position (bottom)
const totalHeight = axisY - graphStartY; // Available height: 260px

// Calculate Y position
const maxMultiplier = 10.0;
const normalizedMultiplier = (currentMultiplier - 1.0) / (maxMultiplier - 1.0); // 0.0 to 1.0

// Parabolic path: y = x² (positive upward parabola)
const parabolicProgress = normalizedMultiplier * normalizedMultiplier;

// Final Y position (moves upward, so subtract from bottom)
const yPosition = axisY - (parabolicProgress * totalHeight);
const finalRocketY = Math.max(graphStartY + 10, Math.min(axisY - 10, yPosition));
```

**Explanation:**
- `parabolicProgress`: Squared value creates upward curve (slow start, fast end)
- `yPosition`: Calculated from bottom (280) upward
- `finalRocketY`: Clamped to stay within graph bounds (30 to 270)

### 🎨 Combined Path (Curved Flight)
Both X and Y progress together to create a smooth curved flight path:

```javascript
// At multiplier = 1.0x
rocketX = 40   (left, bottom)
rocketY = 280  (bottom)

// At multiplier = 5.0x
normalizedMultiplier = (5.0 - 1.0) / (10.0 - 1.0) = 0.444
parabolicProgress = 0.444² = 0.197
rocketX = 40 + (0.3*0.444 + 0.7*0.197) * 320 * 0.9 ≈ 40 + 60 ≈ 100
rocketY = 280 - (0.197 * 260) ≈ 280 - 51 ≈ 229

// At multiplier = 10.0x
normalizedMultiplier = 1.0
parabolicProgress = 1.0
rocketX = 40 + (0.3*1.0 + 0.7*1.0) * 320 * 0.9 ≈ 40 + 288 ≈ 328
rocketY = 280 - (1.0 * 260) = 20 (top)
```

---

## 4. Complete Game Flow

### 🔄 Round Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│ 1. COUNTDOWN PHASE (5 seconds)                         │
│    - Show countdown: 5, 4, 3, 2, 1                     │
│    - Generate random crash point                        │
│    - Reset multiplier to 1.0x                          │
│    - Reset rocket to starting position (40, 280)        │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 2. FLIGHT PHASE                                         │
│    - Start game loop (requestAnimationFrame)            │
│    - Multiplier increases: 1.0x → 1.1x → 1.2x → ...     │
│    - Rocket moves: (40, 280) → curved path upward       │
│    - Update display every frame (60fps)                 │
│    - Check: if multiplier >= crashPoint → CRASH         │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 3. CRASH PHASE                                          │
│    - Stop game loop                                     │
│    - Show crash animation                               │
│    - Display final multiplier                           │
│    - Update game history                               │
│    - Wait 5 seconds                                     │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 4. RESET & REPEAT                                       │
│    - Start new round (go back to step 1)                │
└─────────────────────────────────────────────────────────┘
```

### 📝 Step-by-Step Code Flow

```javascript
// STEP 1: Start New Round
const startNewRound = () => {
  // Reset state
  setMultiplier(1.0);
  setIsRunning(false);
  setIsCrashed(false);
  
  // Generate random crash point
  crashPoint = parseFloat((1.1 + Math.random() * 8.9).toFixed(2));
  console.log(`Crash point: ${crashPoint}x`);
  
  // Reset rocket position
  rocketControls.set({
    translateX: 40,
    translateY: 280,
    opacity: 1,
    rotate: 0
  });
  
  // Start countdown
  startCountdown();
};

// STEP 2: Countdown Complete → Start Flight
const onCountdownComplete = () => {
  setIsRunning(true);
  currentMultiplier = 1.0;
  
  // Start game loop
  requestAnimationFrame(gameLoop);
};

// STEP 3: Game Loop (Runs at 60fps)
const gameLoop = () => {
  if (!isRunning || isCrashed) return;
  
  // Update multiplier
  const deltaTime = getDeltaTime();
  currentMultiplier += SPEED * (deltaTime / 16.67);
  
  // Check crash
  if (currentMultiplier >= crashPoint) {
    handleCrash();
    return;
  }
  
  // Update rocket position
  updateRocketPosition(currentMultiplier);
  
  // Continue loop
  requestAnimationFrame(gameLoop);
};

// STEP 4: Handle Crash
const handleCrash = () => {
  setIsRunning(false);
  setIsCrashed(true);
  setMultiplier(crashPoint);
  
  // Show crash animation
  showCrashEffect();
  
  // Wait 5 seconds, then start new round
  setTimeout(() => {
    startNewRound();
  }, 5000);
};
```

---

## 5. Code Implementation

### 🎯 Complete Simplified Game Logic

```javascript
// ============================================
// CONSTANTS
// ============================================
const MIN_CRASH = 1.1;
const MAX_CRASH = 10.0;
const SPEED = 0.09; // Multiplier increase per frame (at 60fps)
const GRAPH_START_X = 40;
const GRAPH_END_X = 380;
const GRAPH_START_Y = 20;
const GRAPH_END_Y = 280;
const MAX_MULTIPLIER = 10.0;

// ============================================
// STATE VARIABLES
// ============================================
let currentMultiplier = 1.0;
let crashPoint = null;
let isRunning = false;
let isCrashed = false;
let lastUpdateTime = null;
let rafId = null;

// ============================================
// 1. GENERATE RANDOM CRASH POINT
// ============================================
function generateCrashPoint() {
  // Random number between 1.1 and 10.0
  crashPoint = parseFloat((MIN_CRASH + Math.random() * (MAX_CRASH - MIN_CRASH)).toFixed(2));
  console.log(`🎲 Crash point: ${crashPoint}x`);
  return crashPoint;
}

// ============================================
// 2. CALCULATE ROCKET POSITION
// ============================================
function calculateRocketPosition(multiplier) {
  // Normalize multiplier to 0.0-1.0 range
  const normalized = Math.min((multiplier - 1.0) / (MAX_MULTIPLIER - 1.0), 1.0);
  
  // X Position: Curved path (left to right)
  const maxXDistance = GRAPH_END_X - GRAPH_START_X - 20;
  const xProgress = normalized;
  const linearFactor = xProgress;
  const curveFactor = xProgress * xProgress;
  const curvedProgress = linearFactor * 0.3 + curveFactor * 0.7;
  const rocketX = GRAPH_START_X + (curvedProgress * maxXDistance * 0.9);
  
  // Y Position: Parabolic path (bottom to top)
  const parabolicProgress = normalized * normalized;
  const totalHeight = GRAPH_END_Y - GRAPH_START_Y;
  const yPosition = GRAPH_END_Y - (parabolicProgress * totalHeight);
  const rocketY = Math.max(GRAPH_START_Y + 10, Math.min(GRAPH_END_Y - 10, yPosition));
  
  return { x: rocketX, y: rocketY };
}

// ============================================
// 3. GAME LOOP
// ============================================
function gameLoop() {
  // Stop if not running or crashed
  if (!isRunning || isCrashed) {
    return;
  }
  
  // Calculate delta time (for smooth 60fps)
  const now = performance.now();
  const deltaTime = now - (lastUpdateTime || now);
  lastUpdateTime = now;
  
  // Increase multiplier linearly
  currentMultiplier += SPEED * (deltaTime / 16.67); // Normalize to 60fps
  
  // Check if crashed
  if (currentMultiplier >= crashPoint) {
    // CRASH!
    handleCrash();
    return;
  }
  
  // Update rocket position
  const position = calculateRocketPosition(currentMultiplier);
  updateRocketDisplay(position, currentMultiplier);
  
  // Continue loop
  rafId = requestAnimationFrame(gameLoop);
}

// ============================================
// 4. START NEW ROUND
// ============================================
function startNewRound() {
  // Reset state
  currentMultiplier = 1.0;
  isRunning = false;
  isCrashed = false;
  lastUpdateTime = null;
  
  // Cancel any running loop
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  
  // Generate crash point
  generateCrashPoint();
  
  // Reset rocket to starting position
  resetRocketPosition();
  
  // Start countdown (5 seconds)
  startCountdown(() => {
    // Countdown complete → start flight
    isRunning = true;
    rafId = requestAnimationFrame(gameLoop);
  });
}

// ============================================
// 5. HANDLE CRASH
// ============================================
function handleCrash() {
  // Stop game
  isRunning = false;
  isCrashed = true;
  
  // Set final multiplier
  const finalMultiplier = crashPoint;
  currentMultiplier = finalMultiplier;
  
  // Cancel game loop
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  
  // Show crash animation
  showCrashAnimation(finalMultiplier);
  
  // Update game history
  updateGameHistory(finalMultiplier);
  
  // Wait 5 seconds, then start new round
  setTimeout(() => {
    startNewRound();
  }, 5000);
}

// ============================================
// 6. INITIALIZE GAME
// ============================================
function initGame() {
  startNewRound();
}

// Start the game
initGame();
```

---

## 🎮 Key Points Summary

### ✅ Random Crash Point
- **Range**: 1.1x to 10.0x
- **Formula**: `1.1 + Math.random() * 8.9`
- **Generated once per round** before flight starts

### ✅ Rocket Flight
- **Starts at**: 1.0x multiplier
- **Speed**: Linear increase (`SPEED = 0.09` per frame)
- **Stops at**: Crash point
- **Updates**: 60 times per second (60fps)

### ✅ Rocket Position
- **X Position**: Curved path (30% linear + 70% quadratic)
- **Y Position**: Parabolic path (upward curve)
- **Both progress together** for smooth curved flight

### ✅ Game Flow
1. **Countdown** (5 seconds) → Generate crash point
2. **Flight** → Multiplier increases → Rocket moves
3. **Crash** → Stop at crash point → Show animation
4. **Reset** → Wait 5 seconds → Start new round

---

## 🔧 Customization Options

### Adjust Speed
```javascript
const SPEED = 0.05;  // Slower
const SPEED = 0.15;  // Faster
```

### Adjust Crash Range
```javascript
const MIN_CRASH = 1.01;  // Lower minimum
const MAX_CRASH = 20.0;  // Higher maximum
```

### Adjust Path Curvature
```javascript
// More curved (X position)
const curvedProgress = linearFactor * 0.2 + curveFactor * 0.8;

// Less curved (X position)
const curvedProgress = linearFactor * 0.5 + curveFactor * 0.5;
```

### Weighted Crash Points (More Low Values)
```javascript
function generateCrashPoint() {
  const random = Math.random();
  const weightedRandom = random * random; // Square it
  crashPoint = parseFloat((MIN_CRASH + weightedRandom * (MAX_CRASH - MIN_CRASH)).toFixed(2));
}
```

---

## 📚 Additional Resources

- **requestAnimationFrame**: For smooth 60fps animation
- **Performance.now()**: For accurate delta time calculation
- **SVG Coordinates**: Use `translateX`/`translateY` for SVG elements
- **Parabolic Math**: `y = x²` creates upward curve

---

**End of Documentation** 🚀



