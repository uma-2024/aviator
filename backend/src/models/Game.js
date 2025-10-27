const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true,
    default: () => `GAME_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  crashMultiplier: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['waiting', 'running', 'crashed', 'completed'],
    default: 'waiting'
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    betAmount: {
      type: Number,
      required: true,
      default: 0
    },
    cashOutMultiplier: {
      type: Number,
      default: null
    },
    cashOutTime: {
      type: Date,
      default: null
    },
    winnings: {
      type: Number,
      default: 0
    },
    enteredAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalBetAmount: {
    type: Number,
    default: 0
  },
  totalPayout: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update the updatedAt field before saving
gameSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Game', gameSchema);

