const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please add a username'],
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    // Email is optional if phone is provided
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    // Phone is optional if email is provided
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    // Google ID for OAuth users
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false // Don't return password by default
  },
  balance: {
    type: Number,
    default: 1000.00
  },
  totalBets: {
    type: Number,
    default: 0
  },
  totalWins: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Custom validation: Must have either email or phone
userSchema.pre('validate', function(next) {
  if (!this.email && !this.phone) {
    this.invalidate('email', 'Either email or phone must be provided');
    this.invalidate('phone', 'Either email or phone must be provided');
  }
  next();
});

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) {
    next();
  }

  // Hash the password with cost of 12
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

