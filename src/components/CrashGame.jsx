import React, { useState, useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import rocketGif from "../Assets/Rocket.gif";
import AuthModal from "./AuthModal/AuthModal.jsx";
import Deposit from "./Deposit/Deposit.jsx";
import { createGame, endGame, batchAddParticipants, getGame, placeBetAPI, claimWinnings, recordCrashMultiplier, getCrashHistory } from "../services/api.js";
import "./CrashGame.css";

const CrashGame = () => {
  // Authentication state
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' or 'signup'
  const [showDepositModal, setShowDepositModal] = useState(false);
  
  // Game state
  const [multiplier, setMultiplier] = useState(1.0);
  const [isCrashed, setIsCrashed] = useState(false);
  const [roundOver, setRoundOver] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [balance, setBalance] = useState(1000.00);
  const [betAmount, setBetAmount] = useState(1.00);
  const [bets, setBets] = useState(12);
  const [countdown, setCountdown] = useState(5);
  const [currentGameId, setCurrentGameId] = useState(null);
  const [pendingParticipants, setPendingParticipants] = useState([]);
  const [showCountdown, setShowCountdown] = useState(false);
  const [hasPlacedBet, setHasPlacedBet] = useState(false);
  const [isWaitingForGame, setIsWaitingForGame] = useState(false);
  const [userBetInCurrentGame, setUserBetInCurrentGame] = useState(null);
  const [showStatus, setShowStatus] = useState(true);
  const [rocketTrail, setRocketTrail] = useState([]);
  const [showCrashEffect, setShowCrashEffect] = useState(false);
  const [crashPosition, setCrashPosition] = useState({ x: 0, y: 0 });
  const [maxMultiplier, setMaxMultiplier] = useState(1.5);
  const [gameHistory, setGameHistory] = useState([1.66, 1.04, 1.24, 7.60, 1.88, 32.21, 3.59, 1.21, 1.86, 3.25].slice(0, 10));
  const [leaderboard, setLeaderboard] = useState([]);
  const rocketControls = useAnimation();

  // Example crash point (from backend later)
  const crashPoint = useRef(Math.random() * 5 + 1.2);

  // Authentication functions
  const handleLogin = (userData, token) => {
    setUser(userData);
    setBalance(userData.balance || 1000);
    setShowAuthModal(false);
    // Save to localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  const handleSignup = (userData, token) => {
    setUser(userData);
    setBalance(userData.balance || 1000);
    setShowAuthModal(false);
    // Save to localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  const handleLogout = () => {
    setUser(null);
    setBalance(1000);
    setBets([]);
    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };
  
  // Check for saved user on component mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setUser(user);
        setBalance(user.balance || 1000);
      } catch (error) {
        console.error('Error loading saved user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  // Fetch crash history on component mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const result = await getCrashHistory();
        if (result.success && result.data) {
          const multipliers = result.data.map(game => game.multiplier);
          setGameHistory(multipliers.slice(0, 10));
        }
      } catch (error) {
        console.error('Failed to fetch crash history:', error);
      }
    };
    
    fetchHistory();
  }, []);

  // Fetch and update leaderboard from current game
  const updateLeaderboard = async () => {
    if (currentGameId) {
      try {
        const gameData = await getGame(currentGameId);
        if (gameData.success && gameData.data && gameData.data.participants) {
          // Transform participants to leaderboard format
          const leaderboardData = gameData.data.participants.map((participant) => {
            const username = participant.user?.username || 
                           (participant.user?.email ? participant.user.email.split('@')[0] : 'Anonymous');
            // Mask username
            const maskedName = username.length > 5 
              ? username.substring(0, 3) + '*'.repeat(username.length - 3)
              : username.substring(0, 2) + '*'.repeat(username.length - 2);
            
            return {
              name: maskedName,
              amount: participant.betAmount,
              userId: participant.user?._id || participant.user,
              betAmount: participant.betAmount,
              cashOutMultiplier: participant.cashOutMultiplier,
              winnings: participant.winnings
            };
          });
          
          // Sort by bet amount descending
          leaderboardData.sort((a, b) => b.amount - a.amount);
          setLeaderboard(leaderboardData);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      }
    }
  };

  const openAuthModal = (mode = 'login') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
  };

  const openDepositModal = () => {
    setShowDepositModal(true);
  };

  const closeDepositModal = () => {
    setShowDepositModal(false);
  };

  const handleDeposit = (depositData) => {
    // Add deposit amount to balance
    setBalance(prevBalance => prevBalance + depositData.amount);
    setShowDepositModal(false);
  };

  // Set initial rocket position at (0,0) when component mounts
  useEffect(() => {
    const graphStartX = 40;  // Y-axis position
    const graphEndY = 280;   // X-axis position
    rocketControls.set({ x: graphStartX, y: graphEndY });
  }, [rocketControls]);

  const startGame = async () => {
    setIsRunning(true);
    setIsCrashed(false);
    setRoundOver(false);
    setMultiplier(1.0);
    setShowCountdown(false);
    setShowStatus(false);
    setRocketTrail([]);
    setShowCrashEffect(false);
    setMaxMultiplier(1.5); // Reset max multiplier
    crashPoint.current = Math.random() * 5 + 1.2;
    
    // Set initial rocket position at axis intersection (0,0)
    const graphStartX = 40;  // Y-axis position
    const graphEndY = 280;   // X-axis position
    rocketControls.set({ x: graphStartX, y: graphEndY });
    
    // Auto-crash game after 10 seconds if not crashed yet
    setTimeout(async () => {
      if (isRunning && !isCrashed) {
        const crashMultiplier = parseFloat(crashPoint.current.toFixed(2));
        setIsCrashed(true);
        setIsRunning(false);
        setMultiplier(crashMultiplier);
        setGameHistory(prev => [crashMultiplier, ...prev.slice(0, 9)]);
        setShowStatus(true);
        setRoundOver(true);
        
        // End game in database
        if (currentGameId) {
          try {
            await endGame(currentGameId, crashMultiplier);
          } catch (error) {
            console.error('Failed to end game in database:', error);
          }
        }
        
        // Reset rocket to (0,0) after crash animation
        setTimeout(() => {
          rocketControls.set({ x: graphStartX, y: graphEndY, opacity: 1, rotate: 0, scale: 1 });
          setCurrentGameId(null); // Reset game ID
          setHasPlacedBet(false); // Reset bet status for next game
          setUserBetInCurrentGame(null); // Reset user bet info
        }, 1000);
      }
    }, 10000); // 10 seconds game duration
  };
  
  // Create new game at the start of waiting period
  const createNewGameAndAddParticipants = async () => {
    // Create a new game in the database
    let newGameId = null;
    try {
      const gameData = await createGame();
      if (gameData.success && gameData.data) {
        newGameId = gameData.data._id;
        setCurrentGameId(newGameId);
        console.log(`Created new game ${newGameId}`);
        
        // Add all pending participants to the new game in the database
        if (pendingParticipants.length > 0) {
          try {
            const participantData = pendingParticipants.map(p => ({
              userId: p.userId,
              betAmount: p.betAmount
            }));
            await batchAddParticipants(newGameId, participantData);
            console.log(`Added ${pendingParticipants.length} pending participants to game ${newGameId}`);
            setPendingParticipants([]); // Clear pending participants
          } catch (error) {
            console.error('Failed to add participants to game:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to create game in database:', error);
    }
    
    // Update leaderboard after a short delay
    setTimeout(() => {
      updateLeaderboard();
    }, 500);
  };

  const placeBet = async () => {
    if (balance >= betAmount && user) {
      // Use the dedicated bet API
      if (currentGameId) {
        try {
          const result = await placeBetAPI(currentGameId, user._id || user.id, betAmount);
          
          // Update local balance with server response
          if (result.success && result.data && result.data.user) {
            setBalance(result.data.user.balance);
          } else {
            setBalance(prev => prev - betAmount);
          }
          
          setBets(prev => prev + 1);
          setHasPlacedBet(true);
          setUserBetInCurrentGame({ betAmount, gameId: currentGameId });
          console.log(`User ${user.username || user.email || user.phone} placed bet ${betAmount} in game ${currentGameId}`);
          
          // Update leaderboard after placing bet
          setTimeout(() => {
            updateLeaderboard();
          }, 500);
          
        } catch (error) {
          console.error('Failed to place bet:', error);
          alert(error.message || 'Failed to place bet');
          // Don't add to pending, just show error
        }
      } else {
        // No game exists yet, add to pending participants
        setBalance(prev => prev - betAmount);
        setBets(prev => prev + 1);
        setHasPlacedBet(true);
        setUserBetInCurrentGame({ betAmount, gameId: null });
        setPendingParticipants(prev => [...prev, {
          userId: user._id || user.id,
          betAmount: betAmount
        }]);
        console.log(`Added user ${user.username || user.email || user.phone} to pending participants for next game`);
      }
    } else if (!user) {
      alert('Please login to place a bet');
    } else if (balance < betAmount) {
      alert('Insufficient balance');
    }
  };

  const adjustBetAmount = (amount) => {
    const newAmount = betAmount + amount;
    if (newAmount >= 0) {
      setBetAmount(newAmount);
    }
  };

  const handleClaim = async () => {
    if (!user || !currentGameId || !hasPlacedBet || !userBetInCurrentGame) {
      return;
    }

    try {
      const result = await claimWinnings(currentGameId, user._id || user.id, multiplier);
      
      if (result.success) {
        // Update balance
        if (result.data && result.data.user) {
          setBalance(result.data.user.balance);
        }
        
        alert(`Claimed ${result.data.bet.winnings.toFixed(2)} INR at ${multiplier.toFixed(2)}x`);
        setHasPlacedBet(false);
        setUserBetInCurrentGame(null);
        
        // Update leaderboard
        setTimeout(() => {
          updateLeaderboard();
        }, 500);
      }
    } catch (error) {
      console.error('Failed to claim winnings:', error);
      alert(error.message || 'Failed to claim winnings');
    }
  };

  // Countdown timer effect
  useEffect(() => {
    let countdownInterval;
    if (showCountdown && countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setShowCountdown(false);
            startGame();
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownInterval);
  }, [showCountdown, countdown]);

  useEffect(() => {
    let interval;
    if (isRunning && !isCrashed) {
      let start = Date.now();
      interval = setInterval(() => {
        const t = (Date.now() - start) / 1000; // seconds
        
        // Calculate positions for animation within graph coordinates
        const graphWidth = 400;
        const maxMultiplier = 1.5;
        const minMultiplier = 1.0;
        
        // Graph boundaries (with margins)
        const graphStartX = 40;  // Y-axis position
        const graphEndX = 380;   // Right edge
        const graphStartY = 20;  // Top edge
        const graphEndY = 280;   // X-axis position
        
        // Start from axis intersection (0,0) - bottom left of graph area
        const axisX = graphStartX; // Y-axis position (x=40)
        const axisY = graphEndY;   // X-axis position (y=280)
        
        // Dynamic Y-axis scaling based on current max multiplier
        const currentMaxMultiplier = Math.max(maxMultiplier, 1.5); // Start with base max
        const graphHeight = graphEndY - graphStartY; // Total graph height
        
        const maxX = graphEndX - graphStartX - 20; // Maximum X distance (320)
        
        // SMOOTH CURVED ANIMATION - Rocket follows a parabolic path
        const progress = Math.min(t / 10, 1); // Time progress from 0 to 1 over 10 seconds
        
        // Smooth easing for better animation
        const easeOutQuad = (x) => 1 - (1 - x) * (1 - x);
        const smoothedProgress = easeOutQuad(progress);
        
        // Y-axis: Rocket moves up along a curved path as multiplier increases
        // Slower growth - helps when reaching 1.5x and beyond
        const timeMultiplier = 1 + (t * 0.15) ** 1.4;
        const calculatedMultiplier = Math.min(timeMultiplier, crashPoint.current);
        
        // X and Y axis movement based exactly on multiplier value
        const multiplierRange = Math.max(currentMaxMultiplier, crashPoint.current) - 1.0;
        
        // Calculate multiplier progress: 0 to 1 based on actual multiplier value
        let multiplierProgress = 0;
        if (calculatedMultiplier > 1.0 && multiplierRange > 0) {
          multiplierProgress = (calculatedMultiplier - 1.0) / multiplierRange;
        }
        
        // X-axis: Rocket moves smoothly from left (40) to ~70% of max distance
        const maxXDistance = graphEndX - graphStartX - 20; // 320px
        const rocketX = axisX + (multiplierProgress * maxXDistance * 0.75);
        
        // Y-axis: Rocket moves up exactly matching the Y-axis multiplier value
        // Multiplier 1.0x = bottom (280), max multiplier = near top
        let finalRocketY = axisY - (multiplierProgress * graphHeight * 0.85);
        
        // Ensure rocket stays at starting position at multiplier 1.0
        if (calculatedMultiplier <= 1.0) {
          finalRocketY = axisY; // Bottom of graph
        }
        
        // Update max multiplier for dynamic axis scaling
        if (calculatedMultiplier > maxMultiplier) {
          setMaxMultiplier(Math.ceil(calculatedMultiplier * 1.2));
        }
        
        // Update multiplier display
        setMultiplier(parseFloat(calculatedMultiplier.toFixed(2)));
        
        // Keep rocket visible on screen - limit Y position to stay within graph bounds
        const minY = graphStartY + 10; // Minimum Y (top of graph + small margin)
        const maxY = graphEndY - 10;   // Maximum Y (bottom of graph - small margin)
        finalRocketY = Math.max(minY, Math.min(maxY, finalRocketY));
        
        // Update rocket trail
        setRocketTrail(prev => [...prev.slice(-20), { x: rocketX, y: finalRocketY, time: t }]);
        
        if (calculatedMultiplier >= crashPoint.current) {
          const crashValue = parseFloat(crashPoint.current.toFixed(2));
          setIsCrashed(true);
          setIsRunning(false);
          setMultiplier(crashValue);
          setGameHistory(prev => [crashValue, ...prev.slice(0, 9)]);
          setShowStatus(true);
          
          // Record crash multiplier to backend
          if (currentGameId) {
            recordCrashMultiplier(currentGameId, crashValue)
              .then(() => console.log('Crash recorded successfully'))
              .catch(error => console.error('Failed to record crash:', error));
          }
          
          // Set crash position and show effect
          setCrashPosition({ x: rocketX, y: finalRocketY });
          setShowCrashEffect(true);
          
          rocketControls.start({ 
            x: rocketX, 
            y: finalRocketY, 
            opacity: 0, 
            rotate: 30,
            scale: 0.5
          });
          clearInterval(interval);
          setTimeout(() => {
            setRoundOver(true);
            setShowCrashEffect(false);
            // Reset rocket to (0,0) after crash animation
            const graphStartX = 40;  // Y-axis position
            const graphEndY = 280;   // X-axis position
            rocketControls.set({ x: graphStartX, y: graphEndY, opacity: 1, rotate: 0, scale: 1 });
          }, 3000); // 3 seconds as requested
        } else {
          rocketControls.start({ 
            x: rocketX, 
            y: finalRocketY, 
            transition: { 
              duration: 0.1,
              ease: "easeOut"
            } 
          });
        }
      }, 100);
    }

    return () => clearInterval(interval);
  }, [isRunning, isCrashed, rocketControls]);

  // Update leaderboard periodically during game
  useEffect(() => {
    let leaderboardInterval;
    
    if (currentGameId && (isRunning || showCountdown)) {
      // Fetch leaderboard every 2 seconds while game is running
      leaderboardInterval = setInterval(() => {
        updateLeaderboard();
      }, 2000);
    }
    
    return () => clearInterval(leaderboardInterval);
  }, [currentGameId, isRunning, showCountdown]);

  // Auto-start game every 20 seconds (10s wait + 10s game)
  useEffect(() => {
    let gameTimer;
    let waitTimer;
    let timeoutIds = [];
    
    const startAutoGame = async () => {
      if (!isRunning && !showCountdown) {
        setIsWaitingForGame(false); // Game is starting, no longer waiting
        await startGame();
      }
    };
    
      const initializeGame = async () => {
        // Create game immediately and wait 1 minute for users to place bets
        setIsWaitingForGame(true);
        await createNewGameAndAddParticipants();
        
        // Wait 1 minute for users to place bets
        waitTimer = setTimeout(async () => {
          setIsWaitingForGame(false);
          await startAutoGame(); // Start the actual game after 10 seconds
        }, 10000);
      };
      
      // Start first game after 10 seconds wait
      const firstGameTimeout = setTimeout(initializeGame, 10000);
      
      // Then start new game cycle every 20 seconds (10 sec wait + 10 sec game)
      const intervalId = setInterval(async () => {
        if (roundOver && !isRunning && !showCountdown) {
          initializeGame(); // Create game and wait 1 minute
        }
      }, 20000); // Check every 20 seconds (10 sec wait + 10 sec game)
    
    return () => {
      clearTimeout(firstGameTimeout);
      clearTimeout(waitTimer);
      clearInterval(intervalId);
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [isRunning, roundOver, showCountdown]);

  return (
    <div className="space-x1-container">
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <div className="menu-icon">☰</div>
          {/* <div className="volume-icon">🔊</div> */}
        </div>
        <div className="game-title">SPACE X1</div>
       
        <div className="header-right">
          {user ? (
            <div className="user-info">
              <span className="username">{user.username || (user.email && user.email.split('@')[0])}</span>
              <span className="balance">${balance.toFixed(2)}</span>
              <button className="deposit-btn" onClick={openDepositModal}>Deposit</button>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <div className="auth-buttons">
              <button className="login-btn" onClick={() => openAuthModal('login')}>Login</button>
              <button className="signup-btn" onClick={() => openAuthModal('signup')}>Sign Up</button>
            </div>
          )}
          {/* <div className="refresh-icon">↻</div> */}
        </div>
      </div>
      <div className="game-history">
          {gameHistory.slice(0, 10).map((result, index) => {
            const isLast = index === gameHistory.slice(0, 10).length - 1;
            return (
              <span 
                key={index} 
                className={`history-item ${isLast ? 'last-item' : ''}`}
              >
                {result.toFixed(2)}x
              </span>
            );
          })}
        </div>
      <div className="main-content">
        {/* Left Sidebar - Leaderboard */}
        <div className="sidebar">
          <div className="leaderboard-header">
            <span className="trophy">🏆 LEADERBOARD</span>
          </div>
          <div className="leaderboard-table">
            <div className="table-header">
              <div className="header-cell">Player</div>
              <div className="header-cell">Bet (INR)</div>
              <div className="header-cell">Multiplier</div>
              <div className="header-cell">Win (INR)</div>
            </div>
            <div className="table-body">
              {leaderboard.map((player, index) => (
                <div key={index} className="table-row">
                  <div className="table-cell player-cell">{player.name}</div>
                  <div className="table-cell">{player.betAmount ? player.betAmount.toFixed(2) : '0.00'}</div>
                  <div className="table-cell multiplier-cell">
                    {player.cashOutMultiplier ? `${player.cashOutMultiplier.toFixed(2)}x` : 'In Play'}
                  </div>
                  <div className="table-cell winnings-cell">
                    {player.winnings ? player.winnings.toFixed(2) : '0.00'}
                  </div>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div className="empty-state">
                  No participants yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Central Game Area */}
        <div className="game-area">
          
          <div className="graph-container">
            <svg className="graph" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
              {/* Grid Lines */}
              <defs>
                <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#333" strokeWidth="0.3" opacity="0.2"/>
                </pattern>
                <pattern id="majorGrid" width="200" height="150" patternUnits="userSpaceOnUse">
                  <path d="M 200 0 L 0 0 0 150" fill="none" stroke="#444" strokeWidth="0.5" opacity="0.4"/>
                </pattern>
                <radialGradient id="trailGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ff6b35" />
                  <stop offset="100%" stopColor="#ffaa00" />
                </radialGradient>
                <radialGradient id="crashGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ff0000" />
                  <stop offset="50%" stopColor="#ff4444" />
                  <stop offset="100%" stopColor="#ff8888" />
                </radialGradient>
              </defs>
              
              {/* Grid Background */}
              <rect width="400" height="300" fill="url(#grid)" />
              <rect width="400" height="300" fill="url(#majorGrid)" />
              
              {/* Main Axes */}
              <line x1="40" y1="20" x2="40" y2="280" stroke="#666" strokeWidth="2" className="main-axis"/>
              <line x1="40" y1="280" x2="380" y2="280" stroke="#666" strokeWidth="2" className="main-axis"/>
              
              
              {/* Y-axis grid lines and labels */}
              <line x1="40" y1="20" x2="380" y2="20" stroke="#555" strokeWidth="1" opacity="0.6"/>
              <line x1="40" y1="80" x2="380" y2="80" stroke="#555" strokeWidth="1" opacity="0.6"/>
              <line x1="40" y1="140" x2="380" y2="140" stroke="#555" strokeWidth="1" opacity="0.6"/>
              <line x1="40" y1="200" x2="380" y2="200" stroke="#555" strokeWidth="1" opacity="0.6"/>
              <line x1="40" y1="260" x2="380" y2="260" stroke="#555" strokeWidth="1" opacity="0.6"/>
              
              {/* X-axis grid lines and labels */}
              <line x1="100" y1="20" x2="100" y2="280" stroke="#555" strokeWidth="1" opacity="0.6"/>
              <line x1="160" y1="20" x2="160" y2="280" stroke="#555" strokeWidth="1" opacity="0.6"/>
              <line x1="220" y1="20" x2="220" y2="280" stroke="#555" strokeWidth="1" opacity="0.6"/>
              <line x1="280" y1="20" x2="280" y2="280" stroke="#555" strokeWidth="1" opacity="0.6"/>
              <line x1="340" y1="20" x2="340" y2="280" stroke="#555" strokeWidth="1" opacity="0.6"/>
              
              {/* Y-axis labels (Multiplier) - Dynamic scaling based on current multiplier */}
              <text x="5" y="285" className="axis-label">1.0x</text>
              {(() => {
                const labels = [];
                const currentMax = Math.max(maxMultiplier, 1.5);
                const step = (currentMax - 1.0) / 4; // 4 steps between 1.0x and max
                
                for (let i = 1; i <= 4; i++) {
                  const value = 1.0 + (step * i);
                  const y = 285 - (i * 60); // Space labels evenly
                  labels.push(
                    <text key={i} x="5" y={y} className="axis-label">
                      {value < 10 ? value.toFixed(1) : value.toFixed(0)}x
                    </text>
                  );
                }
                
                // Add current multiplier as a special label if it's between the steps
                const currentMultiplier = multiplier;
                if (currentMultiplier > 1.0 && currentMultiplier < currentMax) {
                  const currentY = 285 - ((currentMultiplier - 1.0) / (currentMax - 1.0)) * 240;
                  labels.push(
                    <text key="current" x="5" y={currentY} className="axis-label" style={{fill: '#ff6b35', fontWeight: 'bold'}}>
                      {currentMultiplier.toFixed(2)}x
                    </text>
                  );
                }
                
                return labels;
              })()}
              
              {/* X-axis labels (Time) */}
              <text x="35" y="295" className="axis-label">0s</text>
              <text x="95" y="295" className="axis-label">1s</text>
              <text x="155" y="295" className="axis-label">2s</text>
              <text x="215" y="295" className="axis-label">3s</text>
              <text x="275" y="295" className="axis-label">4s</text>
              <text x="335" y="295" className="axis-label">5s</text>
              
              {/* Axis titles */}
              <text x="200" y="15" className="axis-title" textAnchor="middle">MULTIPLIER</text>
              <text x="390" y="270" className="axis-title" textAnchor="end">TIME</text>
              
              {/* Rocket Trail */}
              {rocketTrail.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r={2 - (rocketTrail.length - index) * 0.05}
                  fill="url(#trailGradient)"
                  opacity={0.6 - (rocketTrail.length - index) * 0.03}
                />
              ))}

              {/* Crash Effect - Red Gradient */}
              {showCrashEffect && (
                <g>
                  {/* Outer glow */}
                  <circle
                    cx={crashPosition.x}
                    cy={crashPosition.y}
                    r="60"
                    fill="url(#crashGradient)"
                    opacity="0.3"
                    className="crash-glow"
                  />
                  {/* Inner bright circle */}
                  <circle
                    cx={crashPosition.x}
                    cy={crashPosition.y}
                    r="30"
                    fill="url(#crashGradient)"
                    opacity="0.6"
                    className="crash-bright"
                  />
                  {/* Center explosion */}
                  <circle
                    cx={crashPosition.x}
                    cy={crashPosition.y}
                    r="15"
                    fill="#ff0000"
                    opacity="0.9"
                    className="crash-center"
                  />
                </g>
              )}
              
              {/* Animated Rocket */}
              <motion.g
                animate={rocketControls}
                className="rocket-graph"
              >
                <image 
                  href={rocketGif} 
                  x="-15" 
                  y="-15" 
                  width="30" 
                  height="30"
                  style={{ filter: 'drop-shadow(0 0 5px rgba(255, 107, 53, 0.8))' }}
                />
              </motion.g>
            </svg>

            {/* Game Status Overlay */}
            {showStatus && (
              <div className="game-status">
                <div className="status-circle">
                  {showCountdown ? (
                    <>
                      <div className="countdown-timer">{countdown}</div>
                      <div className="countdown-text">STARTING IN</div>
                    </>
                  ) : (
                    <>
                      <div className="status-text">NEXT ROUND</div>
                      <div className="status-separator"></div>
                      <div className="bets-count">BETS {bets}</div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Multiplier Display During Game */}
            {isRunning && !showStatus && (
              <div className="multiplier-display-overlay">
                <div className="multiplier-value-display">{multiplier.toFixed(2)}×</div>
                <div className="multiplier-separator-line"></div>
                <div className="bets-display">BETS {bets}</div>
              </div>
            )}

           
          </div>
        </div>
        <div className="control-bar">
        <div className="betting-panel">
          <div className="mode-tabs">
            <button className="mode-tab active">Bet</button>
            <button className="mode-tab">Auto</button>
          </div>
          
          <div className="bet-input-section">
            <button className="bet-adjust-btn" onClick={() => adjustBetAmount(-1)}>-</button>
            <input 
              type="text" 
              className="bet-amount-input" 
              value={betAmount.toFixed(2)}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                if (value >= 0) setBetAmount(value);
              }}
            />
            <button className="bet-adjust-btn" onClick={() => adjustBetAmount(1)}>+</button>
          </div>

          <div className="quick-bets">
            <button className="quick-bet-btn" onClick={() => setBetAmount(100)}>100</button>
            <button className="quick-bet-btn" onClick={() => setBetAmount(200)}>200</button>
            <button className="quick-bet-btn" onClick={() => setBetAmount(500)}>500</button>
            <button className="quick-bet-btn" onClick={() => setBetAmount(1000)}>1,000</button>
          </div>

          <button 
            className="main-bet-btn" 
            onClick={isRunning && hasPlacedBet ? handleClaim : placeBet}
            disabled={isRunning && !hasPlacedBet}
            title={isRunning && !hasPlacedBet ? 'Betting disabled during game if no bet placed' : ''}
          >
            <div>
              {isRunning && hasPlacedBet ? 'Claim Now' : 'Bet'}
            </div>
            <div>
              {isRunning && hasPlacedBet && userBetInCurrentGame 
                ? `Cashout ${userBetInCurrentGame.betAmount.toFixed(2)} INR` 
                : `${betAmount.toFixed(2)} INR`}
            </div>
          </button>
        </div>
      </div>
      </div>

      {/* Bottom Control Bar */}
     

      {/* Authentication Modal */}
      {showAuthModal && (
        <AuthModal
          initialMode={authModalMode}
          onClose={closeAuthModal}
          onLogin={handleLogin}
          onSignup={handleSignup}
        />
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <Deposit
          onClose={closeDepositModal}
          onDeposit={handleDeposit}
        />
      )}
    </div>
  );
};

export default CrashGame;
