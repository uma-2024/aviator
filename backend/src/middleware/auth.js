const jwt = require('jsonwebtoken');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Not authorized to access this route' 
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, 'simple-aviator-game-secret-123');
    
    // Set user from token
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ 
      success: false,
      error: 'Not authorized to access this route' 
    });
  }
};

