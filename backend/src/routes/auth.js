const express = require('express');
const router = express.Router();
const { register, login, getMe, googleAuth } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Register route
router.post('/register', register);

// Login route
router.post('/login', login);

// Google authentication route
router.post('/google', googleAuth);

// Get current user route
router.get('/me', protect, getMe);

module.exports = router;

