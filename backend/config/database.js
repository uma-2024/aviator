const mongoose = require('mongoose');
const path = require('path');

const connectDB = async () => {
  try {
    // Use local MongoDB connection
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aviator_game';
    
    const conn = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    console.log('Make sure MongoDB is running on your local machine');
    process.exit(1);
  }
};

module.exports = connectDB;

