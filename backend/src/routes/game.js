const express = require('express');
const router = express.Router();
const { createGame, joinGame, cashOut, endGame, getGame, batchAddParticipants, recordCrashMultiplier, getCrashHistory } = require('../controllers/gameController');

// Record crash multiplier
router.post('/record-crash', recordCrashMultiplier);

// Get crash history (last 10 multipliers)
router.get('/history', getCrashHistory);

// Create a new game
router.post('/', createGame);

// Get game by ID
router.get('/:gameId', getGame);

// Join a game
router.post('/:gameId/join', joinGame);

// Batch add participants to a game
router.post('/:gameId/participants/batch', batchAddParticipants);

// Cash out from a game
router.post('/:gameId/cashout', cashOut);

// End a game
router.post('/:gameId/end', endGame);

module.exports = router;

