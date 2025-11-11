import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, useAnimation } from "framer-motion";
import { io } from "socket.io-client";
import rocketGif from "../Assets/Rocket.gif";
import AuthModal from "./AuthModal/AuthModal.jsx";
import Deposit from "./Deposit/Deposit.jsx";
import { placeBetAPI, claimWinnings, getCrashHistory, getCurrentUser, getGame } from "../services/api.js";
import "./CrashGame.css";

const CrashGame = () => {
  // Dummy leaderboard data (used when no live data is available)
  const DUMMY_LEADERBOARD = [
    { name: 'Ali***', betAmount: 150.0, cashOutMultiplier: 2.35, winnings: 352.5 },
    { name: 'Pra***', betAmount: 500.0, cashOutMultiplier: 1.75, winnings: 875.0 },
    { name: 'Sam**', betAmount: 75.0, cashOutMultiplier: 3.10, winnings: 232.5 },
    { name: 'Ank***', betAmount: 320.0, cashOutMultiplier: 1.25, winnings: 400.0 },
    { name: 'Rah**', betAmount: 50.0, cashOutMultiplier: null, winnings: 0 },
  ];
  // Authentication state
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' or 'signup'
  const [showDepositModal, setShowDepositModal] = useState(false);
  
  // Game state
  const [multiplier, setMultiplier] = useState(1.0);
  const [displayMultiplier, setDisplayMultiplier] = useState(1.0); // smoothed UI multiplier
  const displayMultiplierRef = useRef(1.0); // Track current displayMultiplier value (not stale)
  const animStartRef = useRef(null);
  const fromMultiplierRef = useRef(1.0);
  const toMultiplierRef = useRef(1.0);
  const rafRef = useRef(null);
  const lastTargetRef = useRef(1.0);
  
  const [isCrashed, setIsCrashed] = useState(false);
  const isCrashedRef = useRef(false);
  const [roundOver, setRoundOver] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const isRunningRef = useRef(false);
  const [balance, setBalance] = useState(1000.00);
  const [betAmount, setBetAmount] = useState(1.00);
  const [bets, setBets] = useState(12);
  const [countdown, setCountdown] = useState(5);
  const [currentGameId, setCurrentGameId] = useState(null);
  const currentGameIdRef = useRef(null);
  // const [pendingParticipants, setPendingParticipants] = useState([]); // Unused - removed for build
  const [showCountdown, setShowCountdown] = useState(false);
  const [hasPlacedBet, setHasPlacedBet] = useState(false);
  const [isWaitingForGame, setIsWaitingForGame] = useState(false);
  const [userBetInCurrentGame, setUserBetInCurrentGame] = useState(null);
  const [showStatus] = useState(true); // Used in JSX, but setter not needed
  const [rocketTrail, setRocketTrail] = useState([]);
  const [showCrashEffect, setShowCrashEffect] = useState(false);
  const [crashPosition, setCrashPosition] = useState({ x: 0, y: 0 });
  // const [maxMultiplier, setMaxMultiplier] = useState(1.5); // Unused - removed for build
  const [gameHistory, setGameHistory] = useState([1.66, 1.04, 1.24, 7.60, 1.88, 32.21, 3.59, 1.21, 1.86, 3.25].slice(0, 10));
  const [leaderboard, setLeaderboard] = useState([]);
  const [claimedUserIds, setClaimedUserIds] = useState(new Set()); // Track recently claimed users
  const rocketControls = useAnimation();

  // Demo mode fallback (opt-in only). UI should use backend by default.
  const [demoMode, setDemoMode] = useState(false);
  const demoInitializedRef = useRef(false);
  const lastMultiplierHandleTsRef = useRef(0);
  const countdownEndTsRef = useRef(null);
  const lastCountdownDisplayRef = useRef(null);
  const SOCKET_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SOCKET_URL)
    || (typeof process !== 'undefined' && process.env && process.env.REACT_APP_SOCKET_URL)
    || 'http://localhost:5000';
  const FORCE_BACKEND = ((typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FORCE_BACKEND) ?? 'true') === 'true';

  // Example crash point (from backend later) - unused, removed for build
  // const crashPoint = useRef(Math.random() * 5 + 1.2);
  
  // Socket.IO connection
  const socketRef = useRef(null);
  
  // Track if game loop is initialized - unused, removed for build
  // const gameLoopInitialized = useRef(false);

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
  
  // Check for saved user on component mount and fetch from API
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Fetch user data from API
          const result = await getCurrentUser(token);
          if (result.success && result.user) {
            setUser(result.user);
            setBalance(result.user.balance || 1000);
          }
        } catch (error) {
          console.error('Error loading user from API:', error);
          // Clear invalid token/user data
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      }
    };
    
    loadUser();
  }, []);

  // Throttled leaderboard updater (max once per 1000ms)
  const leaderboardInFlightRef = useRef(false);
  const lastLeaderboardFetchTsRef = useRef(0);
  const updateLeaderboard = useCallback(async () => {
    const gameId = currentGameIdRef.current;
    if (!gameId) {
      setLeaderboard([]);
      return;
    }

    const now = Date.now();
    if (leaderboardInFlightRef.current || now - lastLeaderboardFetchTsRef.current < 1000) {
      return;
    }
    leaderboardInFlightRef.current = true;
    lastLeaderboardFetchTsRef.current = now;

    try {
      const gameData = await getGame(gameId);
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
            cashOutMultiplier: participant.cashOutMultiplier || null,
            winnings: participant.winnings || 0
          };
        });
        
        // Sort by bet amount descending
        leaderboardData.sort((a, b) => b.amount - a.amount);
        setLeaderboard(leaderboardData);
        
        // Remove highlights for users whose data has been reloaded (they now have cashOutMultiplier)
        setClaimedUserIds(prev => {
          const newSet = new Set(prev);
          leaderboardData.forEach(player => {
            // If player has cashOutMultiplier, data has been reloaded, remove highlight
            if (player.cashOutMultiplier && player.userId) {
              newSet.delete(player.userId.toString());
            }
          });
          return newSet;
        });
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      leaderboardInFlightRef.current = false;
    }
  }, []);

  // Initialize Socket.IO connection and listen to game events
  useEffect(() => {
    currentGameIdRef.current = currentGameId;
  }, [currentGameId]);

  // Keep refs in sync with state for socket handlers
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    isCrashedRef.current = isCrashed;
  }, [isCrashed]);

  useEffect(() => {
    // Connect to Socket.IO server with explicit options
    // All WebSocket events are broadcast to ALL connected clients simultaneously
    // This ensures perfect synchronization for all users across all browsers
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
      forceNew: false
    });
    socketRef.current = socket;

    // Only enable demo mode on failures if backend is NOT forced
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (!FORCE_BACKEND) setDemoMode(true);
    });
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (!FORCE_BACKEND) setDemoMode(true);
    });
    socket.on('connect', () => {
      console.log('Socket connected successfully');
      setDemoMode(false);
    });

    // Listen for new round events - synchronized for all users via WebSocket
    // All users receive this event simultaneously from the backend
    socket.on('new-round', (data) => {
      console.log('New round:', data);
      setCurrentGameId(data.gameId);
      currentGameIdRef.current = data.gameId;
      setIsWaitingForGame(true);
      setIsRunning(false);
      setIsCrashed(false);
      setShowCountdown(true);
      // Calculate countdown end based on server timestamp for synchronization
      // All users use the same server timestamp to ensure synchronized countdown
      const serverTs = data.timestamp ? new Date(data.timestamp).getTime() : Date.now();
      const seconds = Number(data.countdown || 10);
      countdownEndTsRef.current = serverTs + seconds * 1000;
      lastCountdownDisplayRef.current = seconds;
      // Immediately compute first display value
      const remainingNow = Math.max(0, Math.floor((countdownEndTsRef.current - Date.now()) / 1000));
      const initialDisplay = Math.min(seconds, remainingNow);
      lastCountdownDisplayRef.current = initialDisplay;
      setCountdown(initialDisplay);
      setLeaderboard([]); // Clear leaderboard on new round
      setClaimedUserIds(new Set()); // Clear claimed highlights on new round
      // Update leaderboard after a short delay to allow backend to process
      setTimeout(() => updateLeaderboard(), 100);
    });

    // Listen for game start - synchronized for all users via WebSocket
    // All users receive this event simultaneously from the backend
    socket.on('game-start', (data) => {
      console.log('Game started:', data);
      // Only reset if this is for the current game
      // All users will start the game at the same time
      if (data.gameId === currentGameIdRef.current) {
        setIsWaitingForGame(false);
        setIsRunning(true);
        setIsCrashed(false);
        // Update refs synchronously to avoid race conditions with multiplier updates
        isRunningRef.current = true;
        isCrashedRef.current = false;
        setShowCountdown(false);
        countdownEndTsRef.current = null;
        lastCountdownDisplayRef.current = null;
        // Reset multiplier state only at game start
        setMultiplier(1.0);
        setDisplayMultiplier(1.0);
        displayMultiplierRef.current = 1.0; // Reset ref
        // Reset interpolation state
        fromMultiplierRef.current = 1.0;
        toMultiplierRef.current = 1.0;
        lastTargetRef.current = 1.0;
        lastMultiplierHandleTsRef.current = 0; // Reset throttle timer
        animStartRef.current = null;
        // Cancel any existing animation frame
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        // Update leaderboard when game starts
        updateLeaderboard();
      }
    });

    // Listen for multiplier updates - synchronized for all users via WebSocket
    // All users receive the same multiplier values at the same time from the backend
    // Frontend interpolates smoothly between backend updates for smooth animation
    socket.on('multiplier-update', (data) => {
      // Log raw WebSocket data received from backend
      console.log('📡 WebSocket multiplier-update received from backend:', {
        gameId: data.gameId,
        multiplier: data.multiplier,
        timestamp: data.timestamp,
        rawData: data
      });
      
      // All users process the same multiplier value simultaneously
      // Process multiplier updates if game is running and gameId matches
      if (data.gameId === currentGameIdRef.current && isRunningRef.current && !isCrashedRef.current) {
        // Parse multiplier as float (even if backend sends it as integer 1, parse as 1.0)
        const backendValue = parseFloat(data.multiplier) || 1.0;
        
        // Always update raw multiplier value
        setMultiplier(backendValue);
        
        // Only process if value increased (to avoid resetting to lower values)
        if (backendValue >= lastTargetRef.current) {
          console.log(`📈 Multiplier update: ${lastTargetRef.current}x → ${backendValue}x`);
          lastTargetRef.current = backendValue;
          
          // Cancel any existing animation before starting new one
          // This ensures consistent behavior across all browsers
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          
          // Start smooth interpolation from current displayMultiplier to new backend value
          // Use the ref value (not the state, which might be stale in closure)
          const now = performance.now();
          fromMultiplierRef.current = displayMultiplierRef.current; // Start from current display value (not stale)
          toMultiplierRef.current = backendValue;
          animStartRef.current = now;
          
          // Interpolation duration: match backend update interval (100ms) for smooth animation
          // All browsers will interpolate over the same duration for consistent animation
          const durationMs = 100; // Smooth interpolation between backend updates
          
          const animate = (t) => {
            // Check game state using refs (works consistently across browsers)
            if (!isRunningRef.current || isCrashedRef.current) {
              rafRef.current = null;
              return;
            }
            
            const start = animStartRef.current ?? t;
            const elapsed = Math.max(0, t - start);
            const progress = Math.min(1, elapsed / durationMs);
            
            // Smooth easing function (smoothstep) - works consistently across all browsers
            const eased = progress * progress * (3 - 2 * progress);
            const from = fromMultiplierRef.current;
            const to = toMultiplierRef.current;
            const value = from + (to - from) * eased;
            
            // Update display multiplier (all browsers will show the same interpolated value)
            const newValue = parseFloat(value.toFixed(2));
            setDisplayMultiplier(newValue);
            displayMultiplierRef.current = newValue; // Update ref to track current value
            
            // Continue animation if not complete
            if (progress < 1) {
              rafRef.current = requestAnimationFrame(animate);
            } else {
              // Reached target, set exactly (ensures all browsers end at the same value)
              const finalValue = parseFloat(to.toFixed(2));
              setDisplayMultiplier(finalValue);
              displayMultiplierRef.current = finalValue; // Update ref
              rafRef.current = null;
            }
          };
          
          // Start animation immediately
          rafRef.current = requestAnimationFrame(animate);
        } else {
          // Value decreased or stayed same, just set it directly (shouldn't happen during game)
          const directValue = parseFloat(backendValue.toFixed(2));
          setDisplayMultiplier(directValue);
          displayMultiplierRef.current = directValue; // Update ref
          toMultiplierRef.current = backendValue;
        }
      } else {
        console.log('⚠️ Ignored multiplier update - gameId mismatch or game not running:', {
          receivedGameId: data.gameId,
          currentGameId: currentGameIdRef.current,
          isRunning: isRunningRef.current,
          isCrashed: isCrashedRef.current,
          multiplier: data.multiplier
        });
      }
    });

    // Listen for game crash - synchronized for all users via WebSocket
    // All users receive this event simultaneously from the backend
    socket.on('game-crashed', (data) => {
      // Log crash event from backend
      console.log('💥 WebSocket game-crashed received from backend:', {
        gameId: data.gameId,
        multiplier: data.multiplier,
        timestamp: data.timestamp,
        rawData: data
      });
      
      setIsRunning(false);
      setIsCrashed(true);
      // Update refs synchronously to avoid race conditions
      isRunningRef.current = false;
      isCrashedRef.current = true;
      // Use exact crash multiplier value from WebSocket (no interpolation)
      const crashMultiplier = Number(data.multiplier) || 1.0;
      const formattedCrashValue = parseFloat(crashMultiplier.toFixed(2));
      
      console.log(`🛑 Final crash multiplier from backend: ${formattedCrashValue}x (raw: ${crashMultiplier})`);
      console.log(`📊 Setting crash multiplier state to: ${formattedCrashValue}x`);
      
      setMultiplier(formattedCrashValue);
      setDisplayMultiplier(formattedCrashValue);
      displayMultiplierRef.current = formattedCrashValue; // Update ref
      // Cancel any existing animation
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTargetRef.current = crashMultiplier;
      toMultiplierRef.current = crashMultiplier;
      setGameHistory(prev => [data.multiplier, ...prev.slice(0, 9)]);
      
      // Update leaderboard after crash to show final results
      setTimeout(() => updateLeaderboard(), 500);
      
      // The crash position will be set by the animation useEffect based on the multiplier
      // No need to set it manually here
      
      // Set roundOver after a delay
      setTimeout(() => {
        setRoundOver(true);
      }, 2000);
    });

    // Listen for bet placed events - update leaderboard instantly
    socket.on('bet-placed', (data) => {
      console.log('Bet placed by another user:', data);
      if (data.gameId === currentGameIdRef.current) {
        // Update leaderboard immediately when a bet is placed
        updateLeaderboard();
      }
    });

    // Listen for winnings claimed events - update leaderboard and highlight row
    socket.on('winnings-claimed', (data) => {
      console.log('Winnings claimed by user:', data);
      if (data.gameId === currentGameIdRef.current) {
        const userId = data.participant.user._id || data.participant.user;
        // Add userId to claimed set for highlighting
        setClaimedUserIds(prev => {
          const newSet = new Set(prev);
          newSet.add(userId.toString());
          return newSet;
        });
        
        // Update leaderboard immediately when winnings are claimed
        // Highlight will be removed automatically when data is reloaded in updateLeaderboard
        updateLeaderboard();
      }
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // SOCKET_URL and FORCE_BACKEND are constants that don't change
    // updateLeaderboard is a stable useCallback function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Demo mode loop: simulate countdown, game run, multiplier updates, and crash
  useEffect(() => {
    if (!demoMode || demoInitializedRef.current) return;
    demoInitializedRef.current = true;

    let activeIntervals = [];
    let activeTimeouts = [];

    const runDemoRound = () => {
      // Countdown
      setIsRunning(false);
      setIsCrashed(false);
      setShowCountdown(true);
      setCountdown(7);

      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            // Start game
            setShowCountdown(false);
            setIsRunning(true);
            setIsCrashed(false);
            setMultiplier(1.0);
            fromMultiplierRef.current = 1.0;
            toMultiplierRef.current = 1.0;
            lastTargetRef.current = 1.0;
            animStartRef.current = null;

            // Choose a crash point between 1.6x and 3.0x (slower run)
            const crashAt = parseFloat((1.6 + Math.random() * 1.4).toFixed(2));
            let current = 1.0;

            // Smoothly step multiplier upwards (demo mode - use multiplier directly)
            const stepInterval = setInterval(() => {
              const step = 0.03 + Math.random() * 0.07; // smaller steps
              current = Math.min(current + step, crashAt);
              const nextValue = parseFloat(current.toFixed(2));
              setMultiplier(nextValue);

              if (current >= crashAt) {
                clearInterval(stepInterval);
                // Simulate crash
                const crashTimeout = setTimeout(() => {
                  setIsRunning(false);
                  setIsCrashed(true);
                  setMultiplier(crashAt);
                  if (rafRef.current) cancelAnimationFrame(rafRef.current);
                  lastTargetRef.current = Number(crashAt) || 1.0;
                  setGameHistory((prev) => [crashAt, ...prev.slice(0, 9)]);
                  const roundOverTimeout = setTimeout(() => setRoundOver(true), 2000);
                  activeTimeouts.push(roundOverTimeout);
                  // Start next round after a short pause
                  const nextRoundTimeout = setTimeout(() => {
                    setRoundOver(false);
                    runDemoRound();
                  }, 3000);
                  activeTimeouts.push(nextRoundTimeout);
                }, 400);
                activeTimeouts.push(crashTimeout);
              }
            }, 250); // slower tick
            activeIntervals.push(stepInterval);

            return 5; // reset value for next round
          }
          return prev - 1;
        });
      }, 1000);
      activeIntervals.push(countdownInterval);
    };

    runDemoRound();

    return () => {
      activeIntervals.forEach(clearInterval);
      activeTimeouts.forEach(clearTimeout);
      demoInitializedRef.current = false;
    };
  }, [demoMode]);

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

  // OLD GAME LOGIC REMOVED - Backend worker now controls all game logic via Socket.IO

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
        // setPendingParticipants(prev => [...prev, { // Unused - removed for build
        //   userId: user._id || user.id,
        //   betAmount: betAmount
        // }]);
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
        
        // Highlight this user's row
        const userId = user._id || user.id;
        setClaimedUserIds(prev => {
          const newSet = new Set(prev);
          newSet.add(userId.toString());
          return newSet;
        });
        
        // Update leaderboard immediately (Socket.IO event will also trigger this, but this ensures immediate update)
        // Highlight will be removed automatically when data is reloaded in updateLeaderboard
        setTimeout(() => {
          updateLeaderboard();
        }, 300);
      }
    } catch (error) {
      console.error('Failed to claim winnings:', error);
      alert(error.message || 'Failed to claim winnings');
    }
  };

  // Countdown display - synchronized for all users using server timestamp
  // Works consistently across all browsers by using server time instead of client time
  useEffect(() => {
    let tick;
    const update = () => {
      if (!showCountdown || !countdownEndTsRef.current) return;
      
      // Calculate remaining time using server timestamp (synchronized for all users)
      // All browsers calculate from the same server timestamp, ensuring synchronization
      const now = Date.now();
      const rawRemaining = Math.max(0, Math.ceil((countdownEndTsRef.current - now) / 1000));
      
      // Ensure monotonic countdown (never increases) to prevent jitter
      const lastShown = lastCountdownDisplayRef.current == null ? rawRemaining : lastCountdownDisplayRef.current;
      const clamped = Math.max(0, Math.min(lastShown, rawRemaining));
      
      lastCountdownDisplayRef.current = clamped;
      setCountdown(clamped);
      
      if (clamped === 0) {
        // Countdown finished - wait for backend 'game-start' event
        return;
      }
    };
    
    if (showCountdown) {
      update(); // Initial update
      // Update every 100ms for smooth countdown (works consistently across browsers)
      tick = setInterval(update, 100);
    }
    
    return () => {
      if (tick) clearInterval(tick);
    };
  }, [showCountdown]);

  // Rocket animation - synchronized for all users and browsers
  // Uses displayMultiplier which is synchronized across all browsers via WebSocket
  // Works consistently across all browsers using framer-motion
  useEffect(() => {
    // Graph boundaries (consistent across all browsers)
    const graphStartX = 40;  // Y-axis position
    const graphEndX = 380;   // Right edge
    const graphStartY = 20;  // Top edge
    const graphEndY = 280;   // X-axis position
    const axisX = graphStartX;
    const axisY = graphEndY;
    // const graphHeight = graphEndY - graphStartY; // Unused - removed for build
    
    // If not running (cooldown period), show rocket at starting position
    // All browsers will show the same starting position
    if (!isRunning) {
      rocketControls.set({ x: axisX, y: axisY, opacity: 1 });
      return;
    }
    
    // Use displayMultiplier for smooth rocket animation (interpolated between backend updates)
    // All browsers use the same displayMultiplier value, ensuring synchronized animation
    const currentMultiplier = displayMultiplier;
    const fixedMax = 10; // Fixed scale: 1.0 to 10
    
    // Calculate rocket Y position based on new scale: 1.0x at bottom, 2.0x closer, then evenly spaced
    // This matches the Y-axis labels: 1.0x, 2.0x, 4x, 6x, 8x, 10x
    const getRocketYPosition = (multiplier) => {
      if (multiplier <= 1.0) return axisY; // Bottom at 1.0x (280)
      if (multiplier <= 2.0) {
        // Between 1.0x and 2.0x: use 30px spacing (less spacing at bottom)
        const progress = (multiplier - 1.0) / 1.0; // 0 to 1
        return axisY - (progress * 30); // 280 to 250
      }
      // Above 2.0x: distribute remaining space evenly from 2.0x position (250) to top (20)
      const topY = graphStartY; // 20
      const twoXPosition = axisY - 30; // 250 (position of 2.0x)
      const remainingHeight = twoXPosition - topY; // 250 - 20 = 230
      const remainingMultiplier = multiplier - 2.0; // Multiplier above 2.0
      const maxRemainingMultiplier = fixedMax - 2.0; // 8.0 (from 2.0 to 10.0)
      const progress = Math.min(remainingMultiplier / maxRemainingMultiplier, 1.0);
      return twoXPosition - (progress * remainingHeight); // From 250 to 20
    };
    
    // Calculate rocket position
    const maxXDistance = graphEndX - graphStartX - 20;
    // X position: linear progression based on multiplier
    const xProgress = Math.min((currentMultiplier - 1.0) / (fixedMax - 1.0), 1.0);
    const rocketX = axisX + (xProgress * maxXDistance * 0.75);
    
    // Y position: use new scale with less spacing at bottom
    let finalRocketY = getRocketYPosition(currentMultiplier);
    
    // Keep rocket at starting position if multiplier is less than 1.0
    if (currentMultiplier < 1.0) {
      finalRocketY = axisY;
    }
    
    // Constrain to graph bounds (consistent across all browsers)
    const minY = graphStartY + 10;
    const maxY = graphEndY - 10;
    finalRocketY = Math.max(minY, Math.min(maxY, finalRocketY));
    
    // Update rocket trail (all browsers will show the same trail)
    setRocketTrail(prev => [...prev.slice(-20), { x: rocketX, y: finalRocketY, time: 0 }]);
    
    // Animate rocket smoothly using framer-motion (works consistently across all browsers)
    rocketControls.start({ 
      x: rocketX, 
      y: finalRocketY, 
      opacity: 1,
      transition: { 
        duration: 0.05, // Very short duration for smooth continuous movement
        ease: "linear" // Linear easing for consistent animation across browsers
      } 
    });
  }, [displayMultiplier, isRunning, isCrashed, rocketControls]);

  // Handle crash animation - calculate position from final multiplier using new scale (1.0-10)
  useEffect(() => {
    if (isCrashed) {
      const graphStartX = 40;
      const graphEndX = 380;
      const graphStartY = 20;
      const graphEndY = 280;
      const axisX = graphStartX;
      const axisY = graphEndY;
      // const graphHeight = graphEndY - graphStartY; // Unused - removed for build
      
      const fixedMax = 10; // Fixed scale: 1.0 to 10
      const finalMultiplier = multiplier;
      
      // Calculate crash Y position using new scale: 1.0x at bottom, 2.0x closer, then evenly spaced
      const getCrashYPosition = (multiplier) => {
        if (multiplier <= 1.0) return axisY; // Bottom at 1.0x (280)
        if (multiplier <= 2.0) {
          // Between 1.0x and 2.0x: use 30px spacing (less spacing at bottom)
          const progress = (multiplier - 1.0) / 1.0; // 0 to 1
          return axisY - (progress * 30); // 280 to 250
        }
        // Above 2.0x: distribute remaining space evenly from 2.0x position (250) to top (20)
        const topY = graphStartY; // 20
        const twoXPosition = axisY - 30; // 250 (position of 2.0x)
        const remainingHeight = twoXPosition - topY; // 250 - 20 = 230
        const remainingMultiplier = multiplier - 2.0; // Multiplier above 2.0
        const maxRemainingMultiplier = fixedMax - 2.0; // 8.0 (from 2.0 to 10.0)
        const progress = Math.min(remainingMultiplier / maxRemainingMultiplier, 1.0);
        return twoXPosition - (progress * remainingHeight); // From 250 to 20
      };
      
      // Calculate crash position
      const maxXDistance = graphEndX - graphStartX - 20;
      // X position: linear progression based on multiplier
      const xProgress = Math.min((finalMultiplier - 1.0) / (fixedMax - 1.0), 1.0);
      const crashX = axisX + (xProgress * maxXDistance * 0.75);
      
      // Y position: use new scale with less spacing at bottom
      let crashY = getCrashYPosition(finalMultiplier);
      
      if (finalMultiplier < 1.0) {
        crashY = axisY;
      }
      
      const minY = graphStartY + 10;
      const maxY = graphEndY - 10;
      crashY = Math.max(minY, Math.min(maxY, crashY));
      
      setCrashPosition({ x: crashX, y: crashY });
      
      // Move rocket to crash position and hide it
      rocketControls.start({ 
        x: crashX, 
        y: crashY, 
        opacity: 0, 
        rotate: 30,
        scale: 0.5,
        transition: {
          duration: 0.3,
          ease: "easeOut"
        }
      });
      
      // Show crash effect for 3 seconds
      setShowCrashEffect(true);
      setTimeout(() => {
        setShowCrashEffect(false);
        // Reset rocket to starting position after crash animation
        const graphStartX = 40;
        const graphEndY = 280;
        rocketControls.set({ 
          x: graphStartX, 
          y: graphEndY, 
          opacity: 1, 
          rotate: 0,
          scale: 1
        });
      }, 3000);
    }
  }, [isCrashed, multiplier, rocketControls]);

  // Leaderboard is now updated via Socket.IO events only:
  // - new-round: clears and updates after round starts
  // - game-start: updates when game starts
  // - bet-placed: updates instantly when someone places a bet
  // - game-crashed: updates after crash to show final results
  // No polling needed - real-time updates via Socket.IO!

  // FRONTEND GAME LOOP DISABLED - Backend worker now controls the game
  // All game logic is now handled by backend worker via Socket.IO events
  
  // Keep refs in sync with state (kept for compatibility)
  useEffect(() => {
    // State is now controlled by Socket.IO events from backend
  }, [isRunning, roundOver, showCountdown, isWaitingForGame]);

  // Reset roundOver after delay
  useEffect(() => {
    if (roundOver) {
      const timer = setTimeout(() => {
        setRoundOver(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [roundOver]);

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
              <span className="balance">₹{Number(balance.toFixed(2))}</span>
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
            {(leaderboard.length ? leaderboard : DUMMY_LEADERBOARD).map((player, index) => {
              const isClaimed = player.userId && claimedUserIds.has(player.userId.toString());
              return (
                <div key={index} className={`table-row ${isClaimed ? 'claimed-highlight' : ''}`}>
                  <div className="table-cell player-cell">{player.name}</div>
                  <div className="table-cell">{player.betAmount ? player.betAmount.toFixed(2) : '0.00'}</div>
                  <div className="table-cell multiplier-cell">
                    {player.cashOutMultiplier ? `${player.cashOutMultiplier.toFixed(2)}x` : 'In Play'}
                  </div>
                  <div className="table-cell winnings-cell">
                    {player.winnings ? player.winnings.toFixed(2) : '0.00'}
                  </div>
              </div>
              );
            })}
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
              
              
              {/* Y-axis grid lines - Fixed values: 1.0, 2.0, 4, 6, 8, 10 with less spacing at bottom */}
              {(() => {
                // Custom positioning: 1.0x at bottom, 2.0x closer to 1.0x, then evenly spaced above
                const values = [1.0, 2.0, 4, 6, 8, 10];
                const graphStartY = 20;
                const graphEndY = 280;
                
                // Calculate positions with less spacing between 1.0x and 2.0x
                const getYPosition = (value) => {
                  if (value === 1.0) return graphEndY; // Bottom at 280
                  if (value === 2.0) return graphEndY - 30; // At 250 (30px above 1.0x)
                  // For 4, 6, 8, 10: map multiplier values (2.0 to 10.0) to positions (250 to 20)
                  const twoXPosition = graphEndY - 30; // 250 (position of 2.0x)
                  const topY = graphStartY; // 20 (position of 10x)
                  const remainingHeight = twoXPosition - topY; // 250 - 20 = 230
                  // Map multiplier value from 2.0 to 10.0 range to position from 250 to 20
                  const multiplierRange = 10.0 - 2.0; // 8.0
                  const multiplierProgress = (value - 2.0) / multiplierRange; // 0 to 1
                  // Calculate from 2.0x position (250) going upward to top (20)
                  return twoXPosition - (multiplierProgress * remainingHeight);
                };
                
                return values.map((value) => {
                  const yPosition = getYPosition(value);
                  return (
                    <line 
                      key={`y-grid-${value}`}
                      x1="40" 
                      y1={yPosition} 
                      x2="380" 
                      y2={yPosition} 
                      stroke="#555" 
                      strokeWidth="1" 
                      opacity="0.6"
                    />
                  );
                });
              })()}
              
              {/* X-axis grid lines and labels */}
              <line x1="100" y1="20" x2="100" y2="280" stroke="#555" strokeWidth="1" opacity="0.6"/>
              <line x1="160" y1="20" x2="160" y2="280" stroke="#555" strokeWidth="1" opacity="0.6"/>
              <line x1="220" y1="20" x2="220" y2="280" stroke="#555" strokeWidth="1" opacity="0.6"/>
              <line x1="280" y1="20" x2="280" y2="280" stroke="#555" strokeWidth="1" opacity="0.6"/>
              <line x1="340" y1="20" x2="340" y2="280" stroke="#555" strokeWidth="1" opacity="0.6"/>
              
              {/* Y-axis labels (Multiplier) - Fixed values: 1.0, 2.0, 4, 6, 8, 10 with less spacing at bottom */}
              {(() => {
                const values = [1.0, 2.0, 4, 6, 8, 10];
                const graphStartY = 20;
                const graphEndY = 280;
                
                // Calculate positions with less spacing between 1.0x and 2.0x
                const getYPosition = (value) => {
                  if (value === 1.0) return graphEndY; // Bottom at 280
                  if (value === 2.0) return graphEndY - 30; // At 250 (30px above 1.0x)
                  // For 4, 6, 8, 10: map multiplier values (2.0 to 10.0) to positions (250 to 20)
                  const twoXPosition = graphEndY - 30; // 250 (position of 2.0x)
                  const topY = graphStartY; // 20 (position of 10x)
                  const remainingHeight = twoXPosition - topY; // 250 - 20 = 230
                  // Map multiplier value from 2.0 to 10.0 range to position from 250 to 20
                  const multiplierRange = 10.0 - 2.0; // 8.0
                  const multiplierProgress = (value - 2.0) / multiplierRange; // 0 to 1
                  // Calculate from 2.0x position (250) going upward to top (20)
                  return twoXPosition - (multiplierProgress * remainingHeight);
                };
                
                return values.map((value) => {
                  const yPosition = getYPosition(value);
                  return (
                    <text 
                      key={`y-label-${value}`}
                      x="5" 
                      y={yPosition + 4} 
                      className="axis-label"
                    >
                      {value % 1 === 0 ? `${value}x` : `${value.toFixed(1)}x`}
                    </text>
                  );
                });
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
                  {/* Outer glow - Large pulsing circle */}
                  <circle
                    cx={crashPosition.x}
                    cy={crashPosition.y}
                    r="80"
                    fill="url(#crashGradient)"
                    opacity="0.5"
                    className="crash-glow"
                  />
                  {/* Middle circle */}
                  <circle
                    cx={crashPosition.x}
                    cy={crashPosition.y}
                    r="50"
                    fill="url(#crashGradient)"
                    opacity="0.7"
                    className="crash-bright"
                  />
                  {/* Inner bright circle */}
                  <circle
                    cx={crashPosition.x}
                    cy={crashPosition.y}
                    r="30"
                    fill="#ff0000"
                    opacity="0.9"
                    className="crash-center"
                  />
                  {/* Center explosion - bright red */}
                  <circle
                    cx={crashPosition.x}
                    cy={crashPosition.y}
                    r="15"
                    fill="#ffffff"
                    opacity="1"
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
                  width="40" 
                  height="40"
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
                  ) : isRunning ? (
                    <>
                      {/* Multiplier value with smooth interpolation between backend updates */}
                      <div className="multiplier-value-display">{displayMultiplier.toFixed(2)}×</div>
                      <div className="status-separator"></div>
                      <div className="bets-count">BETS {bets}</div>
                    </>
                  ) : isCrashed ? (
                    <>
                      {/* Crash multiplier value from WebSocket backend */}
                      <div className="crash-multiplier-display">{multiplier.toFixed(2)}×</div>
                      <div className="crash-text">CRASHED</div>
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

            {/* Multiplier Display During Game - Legacy, kept for compatibility */}
            {false && (
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
