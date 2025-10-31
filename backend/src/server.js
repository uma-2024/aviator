const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('../config/database');
const GameWorker = require('./workers/gameWorker');

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

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize game worker
const gameWorker = new GameWorker(io);

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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current game state on connection
  socket.emit('worker-state', gameWorker.getCurrentGameState());

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize Socket.IO in app locals for use in routes
app.locals.io = io;

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  
  // Start the game worker
  gameWorker.start().catch(error => {
    console.error('Failed to start game worker:', error);
  });
});

module.exports = { app, server, io };

