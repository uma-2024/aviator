const express = require('express');
const router = express.Router();
const { createGame, joinGame, cashOut, endGame, getGame, batchAddParticipants } = require('../controllers/gameController');

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

