const express = require('express');
const cors = require('cors');
const connectDB = require('../config/database');

// Load env vars
require('dotenv').config();

// Connect to database
connectDB();

// Initialize app
const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use(cors());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/games', require('./routes/game'));
app.use('/api/bets', require('./routes/bet'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Aviator Game Backend API' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found' 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Server Error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

module.exports = app;

