const API_BASE_URL = 'http://localhost:5000/api';

// Register new user
export const registerUser = async (userData) => {
  // Remove undefined fields before sending
  const cleanedData = Object.fromEntries(
    Object.entries(userData).filter(([_, value]) => value !== undefined)
  );

  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cleanedData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  return await response.json();
};

// Login user
export const loginUser = async (credentials) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  return await response.json();
};

// Google authentication
export const googleAuth = async (googleData) => {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(googleData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Google authentication failed');
  }

  return await response.json();
};

// Get current user (requires token)
export const getCurrentUser = async (token) => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get user data');
  }

  return await response.json();
};

// Game API functions
export const createGame = async () => {
  const response = await fetch(`${API_BASE_URL}/games`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create game');
  }

  return await response.json();
};

export const joinGame = async (gameId, userId, betAmount) => {
  const response = await fetch(`${API_BASE_URL}/games/${gameId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      betAmount
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to join game');
  }

  return await response.json();
};

export const cashOutFromGame = async (gameId, userId, currentMultiplier) => {
  const response = await fetch(`${API_BASE_URL}/games/${gameId}/cashout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      currentMultiplier
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to cash out');
  }

  return await response.json();
};

export const endGame = async (gameId, crashMultiplier) => {
  const response = await fetch(`${API_BASE_URL}/games/${gameId}/end`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      crashMultiplier
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to end game');
  }

  return await response.json();
};

export const getGame = async (gameId) => {
  const response = await fetch(`${API_BASE_URL}/games/${gameId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get game');
  }

  return await response.json();
};

export const batchAddParticipants = async (gameId, participants) => {
  const response = await fetch(`${API_BASE_URL}/games/${gameId}/participants/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ participants }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to batch add participants');
  }

  return await response.json();
};

// Bet API functions
export const placeBetAPI = async (gameId, userId, betAmount) => {
  const response = await fetch(`${API_BASE_URL}/bets/place`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      gameId,
      userId,
      betAmount
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to place bet');
  }

  return await response.json();
};

export const getGameBets = async (gameId) => {
  const response = await fetch(`${API_BASE_URL}/bets/game/${gameId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get game bets');
  }

  return await response.json();
};

export const claimWinnings = async (gameId, userId, currentMultiplier) => {
  const response = await fetch(`${API_BASE_URL}/bets/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      gameId,
      userId,
      currentMultiplier
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to claim winnings');
  }

  return await response.json();
};

// Record crash multiplier
export const recordCrashMultiplier = async (gameId, multiplier) => {
  const response = await fetch(`${API_BASE_URL}/games/record-crash`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      gameId,
      multiplier
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to record crash multiplier');
  }

  return await response.json();
};

// Get crash history (last 10 multipliers)
export const getCrashHistory = async () => {
  const response = await fetch(`${API_BASE_URL}/games/history`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get crash history');
  }

  return await response.json();
};

