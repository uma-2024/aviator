# Environment Setup Instructions

## Step 1: Install MongoDB

### For Ubuntu/Debian:
```bash
# Import MongoDB GPG key
sudo apt-get install -y gnupg
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update and install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Check MongoDB status
sudo systemctl status mongod
```

### For macOS:
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### For Windows:
Download and install from: https://www.mongodb.com/try/download/community

## Step 2: Create .env File

1. Navigate to the backend directory:
```bash
cd /home/lenovo/Desktop/Projects/Aviator/backend
```

2. Create a `.env` file with the following content:
```bash
cat > .env << 'EOF'
PORT=5000
MONGODB_URI=mongodb://localhost:27017/aviator_game
NODE_ENV=development
EOF
```

Or manually create the file with:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/aviator_game
NODE_ENV=development
```

## Step 3: Start the Backend Server

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

## Step 4: Test the API

### Using curl:

**Register a new user:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Using the frontend:

Update your frontend API calls to point to:
- Development: `http://localhost:5000/api/auth`
- Production: `https://your-domain.com/api/auth`

