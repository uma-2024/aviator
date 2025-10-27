const Game = require('../models/Game');
const User = require('../models/User');

// @desc    Create a new game
// @route   POST /api/games
// @access  Public
const createGame = async (req, res) => {
  try {
    const game = await Game.create({
      status: 'waiting'
    });

    res.status(201).json({
      success: true,
      data: game
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create game'
    });
  }
};

// @desc    Join a game
// @route   POST /api/games/:gameId/join
// @access  Private
const joinGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { userId, betAmount } = req.body;

    // Validate input
    if (!userId || !betAmount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userId and betAmount'
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

    // Check if user already joined this game
    const existingParticipant = game.participants.find(p => p.user.toString() === userId);
    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        message: 'User already joined this game'
      });
    }

    // Add participant to game with user details
    game.participants.push({
      user: userId,
      betAmount: betAmount,
      enteredAt: Date.now()
    });

    game.totalBetAmount += betAmount;
    await game.save();
    
    // Log the participant details
    console.log(`User joined game:`, {
      gameId: gameId,
      userId: userId,
      username: user.username,
      email: user.email,
      phone: user.phone,
      betAmount: betAmount,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      data: game
    });
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join game'
    });
  }
};

// @desc    Cash out from a game
// @route   POST /api/games/:gameId/cashout
// @access  Private
const cashOut = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { userId } = req.body;

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Find participant
    const participant = game.participants.find(p => p.user.toString() === userId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found in this game'
      });
    }

    // Check if already cashed out
    if (participant.cashOutMultiplier) {
      return res.status(400).json({
        success: false,
        message: 'Already cashed out'
      });
    }

    // Get current multiplier from request
    const currentMultiplier = req.body.currentMultiplier;
    if (!currentMultiplier) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current multiplier'
      });
    }

    // Calculate winnings
    participant.cashOutMultiplier = currentMultiplier;
    participant.cashOutTime = Date.now();
    participant.winnings = participant.betAmount * currentMultiplier;

    // Update user balance
    const user = await User.findById(userId);
    user.balance += participant.winnings;
    await user.save();

    game.totalPayout += participant.winnings;
    await game.save();

    res.status(200).json({
      success: true,
      data: {
        winnings: participant.winnings,
        newBalance: user.balance
      }
    });
  } catch (error) {
    console.error('Error cashing out:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cash out'
    });
  }
};

// @desc    End a game
// @route   POST /api/games/:gameId/end
// @access  Public
const endGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { crashMultiplier } = req.body;

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    game.crashMultiplier = crashMultiplier;
    game.status = 'crashed';
    game.endTime = Date.now();
    await game.save();

    res.status(200).json({
      success: true,
      data: game
    });
  } catch (error) {
    console.error('Error ending game:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end game'
    });
  }
};

// @desc    Batch add participants to a game
// @route   POST /api/games/:gameId/participants/batch
// @access  Public
const batchAddParticipants = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { participants } = req.body; // Array of { userId, betAmount }

    if (!participants || !Array.isArray(participants)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of participants'
      });
    }

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

    // Add all participants
    participants.forEach(participant => {
      const { userId, betAmount } = participant;
      
      // Check if user already joined this game
      const existingParticipant = game.participants.find(p => p.user.toString() === userId);
      
      if (!existingParticipant) {
        game.participants.push({
          user: userId,
          betAmount: betAmount,
          enteredAt: Date.now()
        });
        game.totalBetAmount += betAmount;
      }
    });

    await game.save();

    res.status(200).json({
      success: true,
      data: game,
      message: `Successfully added ${participants.length} participant(s)`
    });
  } catch (error) {
    console.error('Error batch adding participants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add participants'
    });
  }
};

// @desc    Get game by ID
// @route   GET /api/games/:gameId
// @access  Public
const getGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.gameId)
      .populate('participants.user', 'username email phone balance');

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    res.status(200).json({
      success: true,
      data: game
    });
  } catch (error) {
    console.error('Error getting game:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get game'
    });
  }
};

module.exports = {
  createGame,
  joinGame,
  cashOut,
  endGame,
  getGame,
  batchAddParticipants
};

