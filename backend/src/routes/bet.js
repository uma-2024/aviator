const express = require('express');
const router = express.Router();
const { placeBet, getGameBets, claimWinnings } = require('../controllers/betController');

// Place a bet
router.post('/place', placeBet);

// Claim winnings
router.post('/claim', claimWinnings);

// Get all bets for a specific game
router.get('/game/:gameId', getGameBets);

module.exports = router;

