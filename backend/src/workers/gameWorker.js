const Game = require('../models/Game');
const User = require('../models/User');

class GameWorker {
  constructor(io) {
    this.io = io;
    this.currentGameId = null;
    this.isRunning = false;
    this.waitTime = 10000; // 10 seconds waiting for bets
    this.gameDuration = 60000; // 10 seconds game duration
  }

  // Generate random crash point
  generateCrashPoint() {
    // Generate a crash point between 1.01 and 10.00
    return parseFloat((Math.random() * 9 + 1.01).toFixed(2));
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Create a new game round
  async createNewRound() {
    try {
      const crashPoint = this.generateCrashPoint();
     
      
      const game = await Game.create({
        status: 'waiting',
        crashMultiplier: crashPoint,
        startTime: new Date(),
        participants: [],
        totalBetAmount: 0,
        totalPayout: 0
      });

      console.log(`Created new game ${game._id} with crash point: ${crashPoint}x`);
      
      // Broadcast new round to all clients
      if (this.io) {
        this.io.emit('new-round', {
          gameId: game._id,
          status: 'waiting',
          countdown: this.waitTime / 1000,
          timestamp: new Date()
        });
      }

      return game._id;
    } catch (error) {
      console.error('Error creating new round:', error);
      return null;
    }
  }

  // Run the game simulation
  async runGame(gameId) {
    try {
      const game = await Game.findById(gameId);
      if (!game || !game.crashMultiplier) {
        console.error('Game not found or no crash point');
        return;
      }

      const crashPoint = game.crashMultiplier;
      let currentMultiplier = 1.0;
      const speed = 2.02; // Growth factor

      // Update game status to running
      game.status = 'running';
      await game.save();

      console.log(`Starting game ${gameId} - will crash at ${crashPoint}x`);

      // Broadcast game start
      if (this.io) {
        this.io.emit('game-start', {
          gameId: gameId,
          timestamp: new Date()
        });
      }

      // Run the multiplier simulation
      const startTime = Date.now();
      const interval = 100; // Update every 100ms
      let lastMultiplierUpdate = 1.0;
      let lastTimeStep = 0; // Track last time step (0s, 2s, 4s, 6s, etc.)

      while (currentMultiplier < crashPoint) {
        // Calculate time elapsed in seconds
        const elapsed = (Date.now() - startTime) / 1000;
        
        // Calculate which time step we're at (2s, 4s, 6s, 8s, ...)
        // Formula: step = floor(elapsed / 2) * 2, then multiplier = step * 2 / 2 = step
        // Actually: at 2s -> 2x, at 4s -> 4x, at 6s -> 6x, at 8s -> 8x
        const timeStep = Math.floor(elapsed / 2) * 2; // 0, 2, 4, 6, 8, ...
        const targetMultiplier = timeStep === 0 ? 1.0 : timeStep; // Start at 1x, then 2x, 4x, 6x, 8x...
        
        // Only update multiplier if we've reached a new time step
        if (timeStep > lastTimeStep) {
          currentMultiplier = Math.min(targetMultiplier, crashPoint);
          lastMultiplierUpdate = currentMultiplier;
          lastTimeStep = timeStep;
        } else {
          // Keep the same multiplier until next time step
          currentMultiplier = lastMultiplierUpdate;
        }

        // Broadcast multiplier update
        if (this.io) {
          this.io.emit('multiplier-update', {
            gameId: gameId,
            multiplier: parseFloat(currentMultiplier.toFixed(2)),
            timestamp: new Date()
          });
        }

        // Check if we've exceeded game duration
        if (Date.now() - startTime >= this.gameDuration) {
          break;
        }

        // Check if we've reached or exceeded crash point
        if (currentMultiplier >= crashPoint) {
          break;
        }

        await this.sleep(interval);
      }

      // Game crashed!
      game.status = 'crashed';
      game.endTime = new Date();
      await game.save();

      console.log(`Game ${gameId} crashed at ${crashPoint.toFixed(2)}x`);

      // Broadcast crash
      if (this.io) {
        this.io.emit('game-crashed', {
          gameId: gameId,
          multiplier: crashPoint,
          timestamp: new Date()
        });
      }

      // Record crash to game history
      this.recordCrash(gameId, crashPoint);

      // Settle bets
      await this.settleBets(gameId);

    } catch (error) {
      console.error('Error running game:', error);
    }
  }

  // Record crash multiplier
  async recordCrash(gameId, multiplier) {
    try {
      const game = await Game.findById(gameId);
      if (game) {
        game.crashMultiplier = multiplier;
        game.status = 'crashed';
        await game.save();
      }
    } catch (error) {
      console.error('Error recording crash:', error);
    }
  }

  // Settle bets and update user balances
  async settleBets(gameId) {
    try {
      const game = await Game.findById(gameId).populate('participants.user');
      
      if (!game) {
        console.error('Game not found for settlement');
        return;
      }

      console.log(`Settling bets for game ${gameId}`);

      for (const participant of game.participants) {
        const user = participant.user;
        
        if (!user) continue;

        // If user cashed out before crash, they win
        if (participant.cashOutMultiplier && participant.cashOutMultiplier > 0) {
          const winnings = participant.betAmount * participant.cashOutMultiplier;
          
          // Update user balance
          user.balance = Number((user.balance + winnings).toFixed(2));
          await user.save();

          participant.winnings = winnings;
          
          console.log(`User ${user.username} won ${winnings} (bet: ${participant.betAmount}, multiplier: ${participant.cashOutMultiplier})`);
        } else {
          // User didn't cash out, lost their bet
          participant.winnings = 0;
          console.log(`User ${user.username} lost ${participant.betAmount}`);
        }
      }

      // Calculate total payout
      const totalPayout = game.participants.reduce((sum, p) => sum + (p.winnings || 0), 0);
      game.totalPayout = totalPayout;
      await game.save();

      console.log(`Game ${gameId} settlement complete - total payout: ${totalPayout}`);

    } catch (error) {
      console.error('Error settling bets:', error);
    }
  }

  // Main game loop
  async start() {
    if (this.isRunning) {
      console.log('Game worker already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Game worker started');

    // Start the infinite loop
    while (this.isRunning) {
      try {
        // Step 1: Create new round
        const gameId = await this.createNewRound();
        if (!gameId) {
          console.error('Failed to create game, waiting before retry');
          await this.sleep(this.waitTime);
          continue;
        }

        this.currentGameId = gameId;

        // Step 2: Wait for betting period
        console.log(`Waiting ${this.waitTime / 1000} seconds for bets...`);
        await this.sleep(this.waitTime);

        // Step 3: Run the game
        await this.runGame(gameId);

        // Step 4: Cooldown before next round
        console.log('Round complete, cooldown 10 seconds before next round');
        await this.sleep(10000);

      } catch (error) {
        console.error('Error in game loop:', error);
        await this.sleep(5000); // Wait 5 seconds on error before retry
      }
    }
  }

  // Stop the game worker
  stop() {
    this.isRunning = false;
    console.log('Game worker stopped');
  }

  // Get current game state
  getCurrentGameState() {
    return {
      currentGameId: this.currentGameId,
      isRunning: this.isRunning
    };
  }
}

module.exports = GameWorker;

