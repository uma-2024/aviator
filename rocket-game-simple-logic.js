/**
 * 🚀 ROCKET CRASH GAME - SIMPLE LOGIC IMPLEMENTATION
 * 
 * This file contains the core logic for:
 * 1. Random crash point generation
 * 2. Rocket flight (multiplier progression)
 * 3. Rocket position calculation (X and Y coordinates)
 * 
 * Use this as a reference or starting point for your game implementation.
 */

// ============================================
// CONSTANTS
// ============================================
const CONFIG = {
  // Crash point range
  MIN_CRASH: 1.1,      // Minimum multiplier (rocket crashes at least at 1.1x)
  MAX_CRASH: 10.0,     // Maximum multiplier (rocket can go up to 10.0x)
  
  // Multiplier speed
  SPEED: 0.09,         // Multiplier increase per frame (at 60fps)
  
  // Graph boundaries (SVG coordinates)
  GRAPH_START_X: 40,   // Left edge
  GRAPH_END_X: 380,    // Right edge
  GRAPH_START_Y: 20,   // Top edge
  GRAPH_END_Y: 280,    // Bottom edge (X-axis position)
  
  // Multiplier range
  MAX_MULTIPLIER: 10.0, // Maximum multiplier for position calculation
  
  // Path curvature
  X_CURVE_LINEAR: 0.3,  // 30% linear component
  X_CURVE_QUADRATIC: 0.7 // 70% quadratic component (curve)
};

// ============================================
// GAME STATE
// ============================================
let gameState = {
  currentMultiplier: 1.0,
  crashPoint: null,
  isRunning: false,
  isCrashed: false,
  lastUpdateTime: null,
  rafId: null
};

// ============================================
// 1. RANDOM CRASH POINT GENERATION
// ============================================
/**
 * Generates a random crash point between MIN_CRASH and MAX_CRASH
 * 
 * @returns {number} Crash point (e.g., 1.15, 3.42, 7.89)
 */
function generateCrashPoint() {
  const random = Math.random(); // 0.0 to 1.0
  const range = CONFIG.MAX_CRASH - CONFIG.MIN_CRASH; // 8.9
  const crashPoint = CONFIG.MIN_CRASH + (random * range);
  
  // Round to 2 decimal places
  return parseFloat(crashPoint.toFixed(2));
}

/**
 * Generates a weighted crash point (more low values, fewer high values)
 * Uses squared random to favor lower multipliers
 * 
 * @returns {number} Weighted crash point
 */
function generateWeightedCrashPoint() {
  const random = Math.random(); // 0.0 to 1.0
  const weightedRandom = random * random; // Square it (favors lower values)
  const range = CONFIG.MAX_CRASH - CONFIG.MIN_CRASH;
  const crashPoint = CONFIG.MIN_CRASH + (weightedRandom * range);
  
  return parseFloat(crashPoint.toFixed(2));
}

// ============================================
// 2. MULTIPLIER PROGRESSION
// ============================================
/**
 * Updates the multiplier based on elapsed time
 * Uses linear speed (constant increase rate)
 * 
 * @param {number} deltaTime - Time elapsed since last frame (in milliseconds)
 */
function updateMultiplier(deltaTime) {
  // Normalize deltaTime to 60fps (16.67ms per frame)
  const normalizedDelta = deltaTime / 16.67;
  
  // Increase multiplier linearly
  gameState.currentMultiplier += CONFIG.SPEED * normalizedDelta;
  
  // Round to 2 decimal places
  gameState.currentMultiplier = parseFloat(gameState.currentMultiplier.toFixed(2));
}

/**
 * Checks if the rocket has reached the crash point
 * 
 * @returns {boolean} True if crashed, false otherwise
 */
function checkCrash() {
  return gameState.currentMultiplier >= gameState.crashPoint;
}

// ============================================
// 3. ROCKET POSITION CALCULATION
// ============================================
/**
 * Calculates rocket X position (horizontal movement)
 * Creates a curved path from left to right
 * 
 * @param {number} multiplier - Current multiplier (1.0 to MAX_MULTIPLIER)
 * @returns {number} X coordinate (GRAPH_START_X to GRAPH_END_X)
 */
function calculateRocketX(multiplier) {
  // Normalize multiplier to 0.0-1.0 range
  const normalized = Math.min(
    (multiplier - 1.0) / (CONFIG.MAX_MULTIPLIER - 1.0),
    1.0
  );
  
  // Calculate available X distance
  const maxXDistance = CONFIG.GRAPH_END_X - CONFIG.GRAPH_START_X - 20;
  
  // Create curved progress (mix of linear and quadratic)
  const xProgress = normalized;
  const linearFactor = xProgress;
  const curveFactor = xProgress * xProgress; // Quadratic curve
  const curvedProgress = 
    (linearFactor * CONFIG.X_CURVE_LINEAR) + 
    (curveFactor * CONFIG.X_CURVE_QUADRATIC);
  
  // Calculate final X position
  const rocketX = CONFIG.GRAPH_START_X + (curvedProgress * maxXDistance * 0.9);
  
  return rocketX;
}

/**
 * Calculates rocket Y position (vertical movement)
 * Creates a parabolic upward path
 * 
 * @param {number} multiplier - Current multiplier (1.0 to MAX_MULTIPLIER)
 * @returns {number} Y coordinate (GRAPH_START_Y to GRAPH_END_Y)
 */
function calculateRocketY(multiplier) {
  // Normalize multiplier to 0.0-1.0 range
  const normalized = Math.min(
    (multiplier - 1.0) / (CONFIG.MAX_MULTIPLIER - 1.0),
    1.0
  );
  
  // Parabolic progress: y = x² (positive upward parabola)
  const parabolicProgress = normalized * normalized;
  
  // Calculate available height
  const totalHeight = CONFIG.GRAPH_END_Y - CONFIG.GRAPH_START_Y;
  
  // Calculate Y position (moves upward, so subtract from bottom)
  const yPosition = CONFIG.GRAPH_END_Y - (parabolicProgress * totalHeight);
  
  // Clamp to graph boundaries
  const minY = CONFIG.GRAPH_START_Y + 10;
  const maxY = CONFIG.GRAPH_END_Y - 10;
  const rocketY = Math.max(minY, Math.min(maxY, yPosition));
  
  return rocketY;
}

/**
 * Calculates both X and Y positions for the rocket
 * 
 * @param {number} multiplier - Current multiplier
 * @returns {{x: number, y: number}} Rocket position coordinates
 */
function calculateRocketPosition(multiplier) {
  return {
    x: calculateRocketX(multiplier),
    y: calculateRocketY(multiplier)
  };
}

// ============================================
// 4. GAME LOOP
// ============================================
/**
 * Main game loop (runs at 60fps using requestAnimationFrame)
 * Updates multiplier and rocket position every frame
 */
function gameLoop() {
  // Stop if not running or crashed
  if (!gameState.isRunning || gameState.isCrashed) {
    return;
  }
  
  // Calculate delta time
  const now = performance.now();
  const deltaTime = now - (gameState.lastUpdateTime || now);
  gameState.lastUpdateTime = now;
  
  // Update multiplier
  updateMultiplier(deltaTime);
  
  // Check if crashed
  if (checkCrash()) {
    handleCrash();
    return;
  }
  
  // Calculate and update rocket position
  const position = calculateRocketPosition(gameState.currentMultiplier);
  updateRocketDisplay(position, gameState.currentMultiplier);
  
  // Continue loop
  gameState.rafId = requestAnimationFrame(gameLoop);
}

// ============================================
// 5. GAME CONTROL FUNCTIONS
// ============================================
/**
 * Starts a new round
 * Resets state and generates new crash point
 */
function startNewRound() {
  // Reset state
  gameState.currentMultiplier = 1.0;
  gameState.isRunning = false;
  gameState.isCrashed = false;
  gameState.lastUpdateTime = null;
  
  // Cancel any running loop
  if (gameState.rafId) {
    cancelAnimationFrame(gameState.rafId);
    gameState.rafId = null;
  }
  
  // Generate crash point
  gameState.crashPoint = generateCrashPoint();
  console.log(`🎲 New round - Crash point: ${gameState.crashPoint}x`);
  
  // Reset rocket to starting position
  resetRocketPosition();
  
  // Start countdown (implement your countdown logic here)
  startCountdown(() => {
    // Countdown complete → start flight
    gameState.isRunning = true;
    gameState.rafId = requestAnimationFrame(gameLoop);
  });
}

/**
 * Handles crash event
 * Stops game and shows crash animation
 */
function handleCrash() {
  // Stop game
  gameState.isRunning = false;
  gameState.isCrashed = true;
  
  // Set final multiplier
  const finalMultiplier = gameState.crashPoint;
  gameState.currentMultiplier = finalMultiplier;
  
  // Cancel game loop
  if (gameState.rafId) {
    cancelAnimationFrame(gameState.rafId);
    gameState.rafId = null;
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
// 6. HELPER FUNCTIONS (Implement these in your component)
// ============================================
/**
 * Updates rocket display position
 * Call this to update the visual rocket position
 * 
 * @param {{x: number, y: number}} position - Rocket coordinates
 * @param {number} multiplier - Current multiplier
 */
function updateRocketDisplay(position, multiplier) {
  // Implement your rocket animation/position update here
  // Example: rocketControls.set({ translateX: position.x, translateY: position.y });
  console.log(`Rocket at (${position.x.toFixed(1)}, ${position.y.toFixed(1)}) - Multiplier: ${multiplier}x`);
}

/**
 * Resets rocket to starting position
 */
function resetRocketPosition() {
  const startPosition = {
    x: CONFIG.GRAPH_START_X,
    y: CONFIG.GRAPH_END_Y
  };
  updateRocketDisplay(startPosition, 1.0);
}

/**
 * Starts countdown before game begins
 * 
 * @param {Function} onComplete - Callback when countdown finishes
 */
function startCountdown(onComplete) {
  // Implement your countdown logic here
  // Example: Show 5, 4, 3, 2, 1, then call onComplete()
  console.log('Starting countdown...');
  setTimeout(() => {
    console.log('Countdown complete! Starting flight...');
    onComplete();
  }, 5000);
}

/**
 * Shows crash animation
 * 
 * @param {number} finalMultiplier - Final multiplier value
 */
function showCrashAnimation(finalMultiplier) {
  // Implement your crash animation here
  console.log(`💥 CRASH at ${finalMultiplier}x!`);
}

/**
 * Updates game history with crash result
 * 
 * @param {number} multiplier - Crash multiplier
 */
function updateGameHistory(multiplier) {
  // Implement your game history update here
  console.log(`Added to history: ${multiplier}x`);
}

// ============================================
// 7. INITIALIZATION
// ============================================
/**
 * Initializes the game
 */
function initGame() {
  console.log('🚀 Rocket Crash Game initialized!');
  startNewRound();
}

// ============================================
// 8. USAGE EXAMPLE
// ============================================
/*
// Initialize game
initGame();

// Example: Get position for any multiplier
const position1x = calculateRocketPosition(1.0);   // { x: 40, y: 280 }
const position5x = calculateRocketPosition(5.0); // { x: ~100, y: ~229 }
const position10x = calculateRocketPosition(10.0); // { x: ~328, y: 20 }

// Example: Generate crash points
const crash1 = generateCrashPoint();           // Uniform distribution
const crash2 = generateWeightedCrashPoint();   // Weighted (more low values)
*/

// Export functions if using modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateCrashPoint,
    generateWeightedCrashPoint,
    calculateRocketPosition,
    calculateRocketX,
    calculateRocketY,
    updateMultiplier,
    checkCrash,
    startNewRound,
    handleCrash,
    initGame,
    CONFIG,
    gameState
  };
}


