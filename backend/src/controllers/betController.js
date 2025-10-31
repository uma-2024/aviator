const Game = require('../models/Game');
const User = require('../models/User');

// @desc    Place a bet in a game
// @route   POST /api/bets/place
// @access  Public
const placeBet = async (req, res) => {
  try {
    const { gameId, userId, betAmount } = req.body;

    // Parse betAmount to ensure it's a number
    const parsedBetAmount = parseFloat(betAmount);

    // Validation
    if (!gameId || !userId || !betAmount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide gameId, userId, and betAmount'
      });
    }

    if (isNaN(parsedBetAmount) || parsedBetAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Bet amount must be a valid number greater than 0'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if game exists
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Check if game is still accepting participants
    if (game.status !== 'waiting' && game.status !== 'running') {
      return res.status(400).json({
        success: false,
        message: 'Game is no longer accepting participants'
      });
    }

    // Check if user already placed a bet in this game
    const existingBet = game.participants.find(p => p.user.toString() === userId);
    if (existingBet) {
      return res.status(400).json({
        success: false,
        message: 'You have already placed a bet in this game'
      });
    }

    // Check if user has sufficient balance
    if (user.balance < parsedBetAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Deduct bet amount from user balance
    user.balance = Number((user.balance - parsedBetAmount).toFixed(2));
    await user.save();

    // Add participant to game
    game.participants.push({
      user: userId,
      betAmount: parsedBetAmount,
      enteredAt: Date.now()
    });

    game.totalBetAmount += parsedBetAmount;
    await game.save();

    // Log the bet details
    console.log('Bet placed:', {
      gameId: gameId,
      userId: userId,
      username: user.username,
      email: user.email,
      phone: user.phone,
      betAmount: parsedBetAmount,
      newBalance: user.balance,
      timestamp: new Date().toISOString()
    });

    // Get the IO instance from req.app.locals
    const io = req.app.locals.io;
    if (io) {
      // Broadcast to all clients that a bet was placed
      io.emit('bet-placed', {
        gameId: gameId,
        participant: {
          user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            phone: user.phone
          },
          betAmount: parsedBetAmount,
          enteredAt: Date.now()
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bet placed successfully',
      data: {
        user: {
          username: user.username,
          email: user.email,
          phone: user.phone,
          balance: user.balance
        },
        bet: {
          gameId: gameId,
          betAmount: parsedBetAmount,
          entryTime: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error placing bet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place bet'
    });
  }
};

// @desc    Get all bets for a game
// @route   GET /api/bets/game/:gameId
// @access  Public
const getGameBets = async (req, res) => {
  try {
    const { gameId } = req.params;

    const game = await Game.findById(gameId)
      .populate('participants.user', 'username email phone balance');

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Transform participants to bet format
    const bets = game.participants.map(participant => ({
      userId: participant.user._id,
      username: participant.user.username,
      email: participant.user.email,
      phone: participant.user.phone,
      betAmount: participant.betAmount,
      enteredAt: participant.enteredAt,
      cashOutMultiplier: participant.cashOutMultiplier,
      cashOutTime: participant.cashOutTime,
      winnings: participant.winnings
    }));

    res.status(200).json({
      success: true,
      data: {
        gameId: gameId,
        status: game.status,
        totalBets: bets.length,
        totalBetAmount: game.totalBetAmount,
        bets: bets
      }
    });
  } catch (error) {
    console.error('Error getting game bets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get game bets'
    });
  }
};

// @desc    Claim (cash out) from a game
// @route   POST /api/bets/claim
// @access  Public
const claimWinnings = async (req, res) => {
  try {
    const { gameId, userId, currentMultiplier } = req.body;

    // Validation
    if (!gameId || !userId || !currentMultiplier) {
      return res.status(400).json({
        success: false,
        message: 'Please provide gameId, userId, and currentMultiplier'
      });
    }

    // Check if game exists
    const game = await Game.findById(gameId)
      .populate('participants.user', 'username email phone balance');
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Check if game is still running
    if (game.status !== 'running' && game.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        message: 'Game is no longer running'
      });
    }

    // Find the participant
    const participant = game.participants.find(p => {
      const participantUserId = (p.user._id || p.user).toString();
      return participantUserId === userId;
    });
    
    if (!participant) {
      // Log for debugging
      console.log('Game participants:', game.participants.map(p => ({
        userId: (p.user._id || p.user).toString(),
        betAmount: p.betAmount
      })));
      console.log('Looking for userId:', userId);
      
      return res.status(404).json({
        success: false,
        message: 'Participant not found in this game'
      });
    }

    // Check if already claimed
    if (participant.cashOutMultiplier) {
      return res.status(400).json({
        success: false,
        message: 'Already claimed'
      });
    }

    // Calculate winnings
    const winnings = participant.betAmount * currentMultiplier;
    
    // Update participant
    participant.cashOutMultiplier = currentMultiplier;
    participant.cashOutTime = Date.now();
    participant.winnings = winnings;

    // Update user balance
    const user = await User.findById(userId);
    user.balance += winnings;
    await user.save();

    // Update game totals
    game.totalPayout += winnings;
    await game.save();

    console.log('Claim winnings:', {
      gameId: gameId,
      userId: userId,
      betAmount: participant.betAmount,
      multiplier: currentMultiplier,
      winnings: winnings,
      newBalance: user.balance,
      timestamp: new Date().toISOString()
    });

    // Get the IO instance from req.app.locals
    const io = req.app.locals.io;
    if (io) {
      // Broadcast to all clients that winnings were claimed
      io.emit('winnings-claimed', {
        gameId: gameId,
        participant: {
          user: {
            _id: participant.user._id || participant.user,
            username: participant.user.username,
            email: participant.user.email,
            phone: participant.user.phone
          },
          betAmount: participant.betAmount,
          cashOutMultiplier: currentMultiplier,
          winnings: winnings,
          cashOutTime: participant.cashOutTime
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Claimed successfully',
      data: {
        user: {
          balance: user.balance
        },
        bet: {
          betAmount: participant.betAmount,
          multiplier: currentMultiplier,
          winnings: winnings
        }
      }
    });
  } catch (error) {
    console.error('Error claiming winnings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to claim winnings'
    });
  }
};

module.exports = {
  placeBet,
  getGameBets,
  claimWinnings
};

