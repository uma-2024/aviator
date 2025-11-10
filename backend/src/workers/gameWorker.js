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
      
      // Broadcast new round to ALL connected clients simultaneously
      // All users will receive this event at the same time for synchronized countdown
      if (this.io) {
        this.io.emit('new-round', {
          gameId: game._id,
          status: 'waiting',
          countdown: this.waitTime / 1000,
          timestamp: new Date() // Server timestamp for synchronization
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

      // Update game status to running
      game.status = 'running';
      await game.save();

      console.log(`Starting game ${gameId} - will crash at ${crashPoint}x`);

      // Broadcast game start to ALL connected clients simultaneously
      // All users will see the game start at the same time
      if (this.io) {
        this.io.emit('game-start', {
          gameId: gameId,
          timestamp: new Date() // Server timestamp for synchronization
        });
      }

      // Run the multiplier simulation - increment in steps (1.0, 1.1, 1.2, 1.3, 1.4...) with speed
      const startTime = Date.now();
      const incrementStep = 0.1; // Increment by 0.1 each time (1.0, 1.1, 1.2, 1.3, 1.4...)
      const speed = 100; // Update interval in milliseconds (lower = faster, higher = slower)
      // Speed examples: 50ms = very fast, 100ms = fast, 200ms = medium, 500ms = slow
      
      console.log(`Starting multiplier count-up from 1.0 to ${crashPoint}x with step ${incrementStep} and speed ${speed}ms`);
      
      // Send initial multiplier value (1.0) to ALL connected clients simultaneously
      // All users will see the multiplier start at 1.0x at the same time
      // IMPORTANT: Send as number (not integer) to preserve decimal places
      if (this.io) {
        const initialMultiplier = Number(1.0);
        this.io.emit('multiplier-update', {
          gameId: gameId,
          multiplier: initialMultiplier, // Ensure it's sent as a float
          timestamp: new Date() // Server timestamp for synchronization
        });
        console.log(`📤 Sent initial multiplier to all clients: ${initialMultiplier}x (type: ${typeof initialMultiplier})`);
      }
      
      // Wait before starting increments
      await this.sleep(speed);
      
      while (currentMultiplier < crashPoint) {
        // Increment multiplier by exactly 0.1 (1.0, 1.1, 1.2, 1.3, 1.4...)
        const previousMultiplier = currentMultiplier;
        currentMultiplier = currentMultiplier + incrementStep;
        
        // Round to 1 decimal place to avoid floating point precision issues
        currentMultiplier = Math.round(currentMultiplier * 10) / 10;
        
        // Ensure we don't exceed crash point
        if (currentMultiplier >= crashPoint) {
          currentMultiplier = parseFloat(crashPoint.toFixed(2));
        }

        // Log multiplier increment for debugging
        console.log(`📤 Multiplier: ${previousMultiplier.toFixed(1)} → ${currentMultiplier.toFixed(1)}x`);

        // Broadcast multiplier update to ALL connected clients simultaneously
        // All users will receive the same multiplier value at the same time
        // IMPORTANT: Send as number (not integer) to preserve decimal places
        if (this.io) {
          // Ensure we send a float value, not an integer
          const multiplierToSend = Number(currentMultiplier.toFixed(2));
          this.io.emit('multiplier-update', {
            gameId: gameId,
            multiplier: multiplierToSend, // This will be serialized correctly as a float
            timestamp: new Date() // Server timestamp for synchronization
          });
          console.log(`📡 Emitted multiplier to all clients: ${multiplierToSend}x (type: ${typeof multiplierToSend})`);
        }

        // Check if we've reached or exceeded crash point BEFORE waiting
        if (currentMultiplier >= crashPoint) {
          console.log(`Reached crash point: ${crashPoint}x`);
          // Send final multiplier update
          if (this.io) {
            const finalMultiplier = Number(crashPoint.toFixed(2));
            this.io.emit('multiplier-update', {
              gameId: gameId,
              multiplier: finalMultiplier,
              timestamp: new Date()
            });
            console.log(`📡 Sent final multiplier: ${finalMultiplier}x`);
          }
          break;
        }

        // Check if we've exceeded game duration
        const elapsed = Date.now() - startTime;
        if (elapsed >= this.gameDuration) {
          console.log('Game duration exceeded');
          break;
        }

        // Wait before next increment to ensure proper timing
        await this.sleep(speed);
      }

      // Game crashed!
      game.status = 'crashed';
      game.endTime = new Date();
      await game.save();

      console.log(`Game ${gameId} crashed at ${crashPoint.toFixed(2)}x`);

      // Broadcast crash to ALL connected clients simultaneously
      // All users will see the crash at the same time
      if (this.io) {
        this.io.emit('game-crashed', {
          gameId: gameId,
          multiplier: crashPoint,
          timestamp: new Date() // Server timestamp for synchronization
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

