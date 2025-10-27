# Aviator Game Backend API

Backend API for the Aviator game built with Node.js, Express, and MongoDB.

## Features

- User Authentication (Login/Signup)
- JWT Token-based authentication
- MongoDB database for user data
- Balance tracking for users
- RESTful API endpoints

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the backend directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/aviator_game
NODE_ENV=development
```

3. Make sure MongoDB is running on your local machine

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Authentication

#### POST `/api/auth/register`
Register a new user

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "username": "john_doe",
    "email": "john@example.com",
    "balance": 1000.00,
    "totalBets": 0,
    "totalWins": 0
  }
}
```

#### POST `/api/auth/login`
Login user

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "username": "john_doe",
    "email": "john@example.com",
    "balance": 1000.00,
    "totalBets": 0,
    "totalWins": 0
  }
}
```

#### GET `/api/auth/me`
Get current logged-in user (Protected)

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "username": "john_doe",
    "email": "john@example.com",
    "balance": 1000.00,
    "totalBets": 0,
    "totalWins": 0
  }
}
```

## Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── src/
│   ├── controllers/
│   │   └── authController.js # Authentication logic
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── models/
│   │   └── User.js          # User model/schema
│   ├── routes/
│   │   └── auth.js          # Authentication routes
│   └── server.js            # Express app setup
├── package.json
└── README.md
```

## Technologies

- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

