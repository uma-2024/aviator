const User = require('../models/User');
const jwt = require('jsonwebtoken');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;

    console.log('Registration request:', { username, email, phone, hasPassword: !!password });

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide username and password'
      });
    }

    // Must have either email or phone
    const hasEmail = email && email.trim() !== '';
    const hasPhone = phone && phone.trim() !== '';
    
    if (!hasEmail && !hasPhone) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email or phone number'
      });
    }

    // Check if username exists
    const usernameExists = await User.findOne({ username });

    if (usernameExists) {
      return res.status(400).json({
        success: false,
        error: 'Username already taken'
      });
    }

    // Check if email exists
    if (hasEmail) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered'
        });
      }
    }

    // Check if phone exists
    if (hasPhone) {
      const phoneExists = await User.findOne({ $or: [{ email: phone }, { phone }] });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          error: 'Phone number already registered'
        });
      }
    }

    // Create user with email OR phone
    const userData = {
      username,
      password
    };
    
    if (hasEmail) {
      userData.email = email;
    }
    
    if (hasPhone) {
      userData.phone = phone;
    }
    
    const user = await User.create(userData);

    // Create token
    const token = jwt.sign(
      { id: user._id },
      'simple-aviator-game-secret-123',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email || null,
        phone: user.phone || null,
        balance: user.balance,
        totalBets: user.totalBets,
        totalWins: user.totalWins
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password, phone, identifier } = req.body;

    // Validate identifier (can be email or phone) and password
    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide password'
      });
    }

    // Support both email/phone and new identifier field
    const lookupValue = identifier || email || phone;
    
    if (!lookupValue) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email or phone number'
      });
    }

    // Check for user with email or phone
    const user = await User.findOne({ 
      $or: [{ email: lookupValue }, { phone: lookupValue }] 
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Create token
    const token = jwt.sign(
      { id: user._id },
      'simple-aviator-game-secret-123',
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email || null,
        phone: user.phone || null,
        balance: user.balance,
        totalBets: user.totalBets,
        totalWins: user.totalWins
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email || null,
        phone: user.phone || null,
        balance: user.balance,
        totalBets: user.totalBets,
        totalWins: user.totalWins
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Register or login with Google
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = async (req, res) => {
  try {
    const { googleId, email, name } = req.body;

    console.log('Google auth request:', { googleId, email, name });

    // Validation
    if (!googleId || !email) {
      return res.status(400).json({
        success: false,
        error: 'Please provide Google ID and email'
      });
    }

    // Generate username from name or email
    const username = name ? name.replace(/\s+/g, '').toLowerCase() : email.split('@')[0];
    const uniqueUsername = `${username}_${googleId.substring(0, 6)}`;

    // Check if user exists with this Google ID or email
    let user = await User.findOne({ 
      $or: [
        { email },
        { googleId }
      ] 
    });

    if (user) {
      // User exists, just login
      const token = jwt.sign(
        { id: user._id },
        'simple-aviator-game-secret-123',
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email || null,
          phone: user.phone || null,
          balance: user.balance,
          totalBets: user.totalBets,
          totalWins: user.totalWins
        }
      });
    }

    // Create new user with Google account
    user = await User.create({
      username: uniqueUsername,
      email,
      googleId,
      password: `google_${googleId}_${Date.now()}`, // Random password for Google users
      balance: 1000
    });

    const token = jwt.sign(
      { id: user._id },
      'simple-aviator-game-secret-123',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email || null,
        phone: user.phone || null,
        balance: user.balance,
        totalBets: user.totalBets,
        totalWins: user.totalWins
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

