import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, useAnimation } from "framer-motion";
import { HiSpeakerWave } from "react-icons/hi2";
import { RxSpeakerOff } from "react-icons/rx";
import rocketGif from "../Assets/Rocket.gif";
import AuthModal from "./AuthModal/AuthModal.jsx";
import Deposit from "./Deposit/Deposit.jsx";
import { placeBetAPI, claimWinnings, getCrashHistory, getCurrentUser, getGame } from "../services/api.js";
import "./CrashGame.css";

const CrashGame = () => {
  // Fake usernames pool for generating realistic fake members
  const FAKE_USERNAMES = [
    'Moc', 'Ume', 'xEk', 'han', 'fop', 'mav', 'Ali', 'Pra', 'Sam', 'Ank',
    'Rah', 'Tom', 'Jer', 'Max', 'Leo', 'Zoe', 'Kim', 'Dan', 'Eva', 'Roy',
    'Ivy', 'Ben', 'Amy', 'Jay', 'Kay', 'Rob', 'Tim', 'Joe', 'Bob', 'Pat'
  ];

  // Generate a fake user with masked name
  const generateFakeUser = () => {
    const baseName = FAKE_USERNAMES[Math.floor(Math.random() * FAKE_USERNAMES.length)];
    const nameLength = baseName.length;
    const maskLength = Math.floor(Math.random() * 3) + 2; // 2-4 asterisks
    const maskedName = baseName + '*'.repeat(maskLength);

    const betAmount = Math.floor(Math.random() * 900 + 10); // 10-1000
    // 70% chance of having cashed out, 30% chance still in play
    const hasCashedOut = Math.random() > 0.3;
    const cashOutMultiplier = hasCashedOut
      ? parseFloat((1.05 + Math.random() * 8.95).toFixed(2)) // 1.05x to 10.0x
      : null;
    const winnings = hasCashedOut
      ? parseFloat((betAmount * cashOutMultiplier).toFixed(2))
      : (Math.random() > 0.5 ? 1.00 : 0.00); // Some losses show 1.00 FUN

    return {
      name: maskedName,
      betAmount: betAmount,
      cashOutMultiplier: cashOutMultiplier,
      winnings: winnings,
      userId: `fake_${Date.now()}_${Math.random()}`,
      isFake: true
    };
  };
  // Authentication state
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' or 'signup'
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [musicVolume, setMusicVolume] = useState(() => {
    const saved = localStorage.getItem('musicVolume');
    return saved ? parseInt(saved) : 80;
  });
  const [musicMuted, setMusicMuted] = useState(() => {
    const saved = localStorage.getItem('musicMuted');
    return saved === 'true';
  });
  const [soundFxVolume, setSoundFxVolume] = useState(() => {
    const saved = localStorage.getItem('soundFxVolume');
    return saved ? parseInt(saved) : 80;
  });
  const [soundFxMuted, setSoundFxMuted] = useState(() => {
    const saved = localStorage.getItem('soundFxMuted');
    return saved === 'true';
  });
  const [viewInFun, setViewInFun] = useState(() => {
    const saved = localStorage.getItem('viewInFun');
    return saved === 'true';
  });
  const [menuIconPosition, setMenuIconPosition] = useState({ top: 0, left: 0 });
  const menuIconRef = useRef(null);

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
  const [betAmount, setBetAmount] = useState(50.00);
  const [betAmount2, setBetAmount2] = useState(50.00); // Second betting slot
  const [bets, setBets] = useState(12);
  const [autoMode, setAutoMode] = useState(false);
  const [autoMultiplier, setAutoMultiplier] = useState(null);
  const [autoMultiplier2, setAutoMultiplier2] = useState(null); // Second slot multiplier
  const [countdown, setCountdown] = useState(5);
  const [smoothCountdown, setSmoothCountdown] = useState(5); // For smooth circular animation
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
  const [fakeMembers, setFakeMembers] = useState([]); // Fake members for realistic look
  const fakeMembersIntervalRef = useRef(null);
  const fakeMembersAddedRef = useRef(0);
  const cashOutIntervalRef = useRef(null); // Interval for cashing out members during game
  const cashedOutCountRef = useRef(0); // Track how many members have cashed out
  const rocketControls = useAnimation();

  // Frontend-only game mode - generates random multipliers locally
  const gameIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const crashPointRef = useRef(null);
  const lastUpdateTimeRef = useRef(null);
  const currentMultiplierRef = useRef(1.0);

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
            winnings: participant.winnings || 0,
            isFake: false // Mark as real user
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

  // Frontend-only game loop - generates random multipliers locally
  useEffect(() => {
    // Keep refs in sync with state
    currentGameIdRef.current = currentGameId;
    isRunningRef.current = isRunning;
    isCrashedRef.current = isCrashed;
  }, [currentGameId, isRunning, isCrashed]);

  // Add fake members gradually during countdown (before match starts)
  // Members join one by one like real users joining
  useEffect(() => {
    if (!showCountdown) {
      // Clear interval when countdown ends
      if (fakeMembersIntervalRef.current) {
        clearTimeout(fakeMembersIntervalRef.current);
        fakeMembersIntervalRef.current = null;
      }
      return;
    }

    // Reset counter when countdown starts
    fakeMembersAddedRef.current = 0;
    const targetCount = Math.floor(Math.random() * 4) + 12; // Minimum 12, up to 15 members

    const addFakeMembers = () => {
      // Stop if countdown ended
      if (!showCountdown) {
        return;
      }

      // Calculate how many members still need to be added
      const remaining = targetCount - fakeMembersAddedRef.current;

      // If we've reached minimum 12, we can stop (but can add more up to targetCount)
      if (remaining <= 0) {
        return;
      }

      // Add 2-5 members at a time (random batch size)
      const batchSize = Math.min(
        Math.floor(Math.random() * 4) + 2, // 2-5 members
        remaining // Don't exceed remaining count
      );

      const newMembers = [];
      for (let i = 0; i < batchSize; i++) {
        const newMember = generateFakeUser();
        // All members added before game starts are "In Play" (no cash out yet)
        // They will cash out randomly after game starts
        newMember.cashOutMultiplier = null;
        newMember.winnings = 0;
        newMembers.push(newMember);
      }

      setFakeMembers(prev => {
        // Add new members, remove duplicates by userId
        const combined = [...prev, ...newMembers];
        const unique = combined.filter((member, index, self) =>
          index === self.findIndex(m => m.userId === member.userId)
        );
        return unique;
      });

      fakeMembersAddedRef.current += batchSize;

      // Schedule next addition (0.3-1.5 seconds delay for faster batch joining)
      if (showCountdown && fakeMembersAddedRef.current < targetCount) {
        const delay = Math.floor(Math.random() * 1200) + 300; // 0.3-1.5 seconds
        fakeMembersIntervalRef.current = setTimeout(addFakeMembers, delay);
      }
    };

    // Start adding fake members immediately when countdown starts
    const initialDelay = Math.floor(Math.random() * 800) + 200; // 0.2-1 second
    fakeMembersIntervalRef.current = setTimeout(addFakeMembers, initialDelay);

    return () => {
      if (fakeMembersIntervalRef.current) {
        clearTimeout(fakeMembersIntervalRef.current);
        fakeMembersIntervalRef.current = null;
      }
    };
  }, [showCountdown]); // Run when countdown starts

  // Frontend game loop - generates random multipliers and controls game flow
  useEffect(() => {
    const startNewRound = () => {
      // Clear any existing intervals
      if (gameIntervalRef.current) {
        clearTimeout(gameIntervalRef.current);
        gameIntervalRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      // Reset game state
      setIsRunning(false);
      setIsCrashed(false);
      setIsWaitingForGame(true);
      setShowCountdown(true);
      setCountdown(5);
      setSmoothCountdown(5);
      setMultiplier(1.0);
      setDisplayMultiplier(1.0);
      displayMultiplierRef.current = 1.0;
      fromMultiplierRef.current = 1.0;
      toMultiplierRef.current = 1.0;
      lastTargetRef.current = 1.0;
      currentMultiplierRef.current = 1.0;

      // Generate random crash point between 1.1x and 10.0x
      crashPointRef.current = parseFloat((1.1 + Math.random() * 8.9).toFixed(2));
      console.log(`🎲 New round starting - crash point: ${crashPointRef.current}x`);

      // Reset fake members for new round - they'll be added during countdown
      setFakeMembers([]);

      // Countdown phase with smooth animation
      let countdownValue = 5;
      const countdownStartTime = Date.now();
      const countdownDuration = 5000; // 5 seconds
      
      // Smooth animation using requestAnimationFrame
      const animateCountdown = () => {
        const elapsed = Date.now() - countdownStartTime;
        const remaining = Math.max(0, countdownDuration - elapsed);
        const smoothValue = remaining / 1000; // Convert to seconds
        
        setSmoothCountdown(smoothValue);
        
        // Update display countdown (integer)
        const displayValue = Math.ceil(smoothValue);
        if (displayValue !== countdownValue) {
          countdownValue = displayValue;
          setCountdown(countdownValue);
        }
        
        if (remaining > 0) {
          requestAnimationFrame(animateCountdown);
        } else {
          // Countdown finished
          setSmoothCountdown(0);
          setCountdown(0);
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          // Start game
          setIsWaitingForGame(false);
          setIsRunning(true);
          setIsCrashed(false);
          setShowCountdown(false);
          isRunningRef.current = true;
          isCrashedRef.current = false;
          lastUpdateTimeRef.current = performance.now();
          currentMultiplierRef.current = 1.0;

          // Start game loop
          startGameLoop();
        }
      };
      
      // Start smooth animation
      requestAnimationFrame(animateCountdown);
      
      // Also update display countdown every second for text
      countdownIntervalRef.current = setInterval(() => {
        // This is handled by animateCountdown now, but keeping for safety
      }, 1000);
    };

    const startGameLoop = () => {
      const updateInterval = 50; // Update every 50ms for smooth animation

      // Start cashing out fake members randomly during the game
      const startCashOuts = () => {
        cashedOutCountRef.current = 0; // Reset counter when game starts

        const cashOutMembers = () => {
          if (!isRunningRef.current || isCrashedRef.current) {
            return;
          }

          setFakeMembers(prev => {
            // Get members still in play
            const inPlayMembers = prev.filter(m => !m.cashOutMultiplier);

            if (inPlayMembers.length === 0) return prev;

            // Calculate how many more need to cash out to reach minimum 4
            const remainingToReachMin = Math.max(0, 4 - cashedOutCountRef.current);

            // Determine batch size: ensure we reach at least 4, then random 1-3
            let membersToCashOut;
            if (remainingToReachMin > 0) {
              // Need to cash out more to reach minimum 4
              membersToCashOut = Math.min(
                remainingToReachMin + Math.floor(Math.random() * 2), // Add 0-1 extra
                inPlayMembers.length
              );
            } else {
              // Already have 4+, can cash out 1-3 randomly
              membersToCashOut = Math.min(
                Math.floor(Math.random() * 3) + 1, // 1-3 members randomly
                inPlayMembers.length
              );
            }

            // Shuffle and take random members
            const shuffled = [...inPlayMembers].sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, membersToCashOut);
            const selectedIds = new Set(selected.map(m => m.userId));

            cashedOutCountRef.current += membersToCashOut; // Update counter

            return prev.map(member => {
              // If this member is selected to cash out
              if (selectedIds.has(member.userId)) {
                const currentMultiplier = currentMultiplierRef.current;
                // Cash out at current multiplier or slightly below (more realistic)
                const cashOutMultiplier = parseFloat(
                  Math.max(1.05, Math.min(currentMultiplier, currentMultiplier - 0.05 + Math.random() * 0.15)).toFixed(2)
                );
                return {
                  ...member,
                  cashOutMultiplier: cashOutMultiplier,
                  winnings: parseFloat((member.betAmount * cashOutMultiplier).toFixed(2))
                };
              }
              return member;
            });
          });

          // Schedule next cash out check (0.5-2 seconds) - random timing
          if (isRunningRef.current && !isCrashedRef.current) {
            const delay = Math.floor(Math.random() * 1500) + 500; // 0.5-2 seconds
            cashOutIntervalRef.current = setTimeout(cashOutMembers, delay);
          }
        };

        // Start first cash out check after 0.3-1 second (quick start after game begins)
        const initialDelay = Math.floor(Math.random() * 700) + 300;
        cashOutIntervalRef.current = setTimeout(cashOutMembers, initialDelay);
      };

      startCashOuts();

      const gameLoop = () => {
        if (!isRunningRef.current || isCrashedRef.current) {
          return;
        }

        const now = performance.now();
        const deltaTime = now - (lastUpdateTimeRef.current || now);
        lastUpdateTimeRef.current = now;

        // Increment multiplier smoothly
        // Speed increases slightly as multiplier increases
        const speed = 0.02 + (currentMultiplierRef.current * 0.01);
        currentMultiplierRef.current += speed * (deltaTime / 16); // Normalize to 60fps

        // Check if we've reached crash point
        if (currentMultiplierRef.current >= crashPointRef.current) {
          // Crash!
          const finalMultiplier = crashPointRef.current;
          setIsRunning(false);
          setIsCrashed(true);
          isRunningRef.current = false;
          isCrashedRef.current = true;

          setMultiplier(finalMultiplier);
          setDisplayMultiplier(finalMultiplier);
          displayMultiplierRef.current = finalMultiplier;
          lastTargetRef.current = finalMultiplier;

          // Clear game interval
          if (gameIntervalRef.current) {
            clearTimeout(gameIntervalRef.current);
            gameIntervalRef.current = null;
          }

          // Clear cash out interval
          if (cashOutIntervalRef.current) {
            clearTimeout(cashOutIntervalRef.current);
            cashOutIntervalRef.current = null;
          }

          // Update game history
          setGameHistory(prev => [finalMultiplier, ...prev.slice(0, 9)]);

          // Set roundOver after delay
          setTimeout(() => {
            setRoundOver(true);
          }, 2000);

          // Start next round after crash animation
          setTimeout(() => {
            setRoundOver(false);
            startNewRound();
          }, 5000);

          return;
        }

        // Update multiplier state
        const roundedMultiplier = parseFloat(currentMultiplierRef.current.toFixed(2));
        setMultiplier(roundedMultiplier);
        setDisplayMultiplier(roundedMultiplier);
        displayMultiplierRef.current = roundedMultiplier;
        lastTargetRef.current = roundedMultiplier;

        // Continue game loop
        gameIntervalRef.current = setTimeout(gameLoop, updateInterval);
      };

      gameLoop();
    };

    // Start first round
    startNewRound();

    // Cleanup
    return () => {
      if (gameIntervalRef.current) {
        clearTimeout(gameIntervalRef.current);
        gameIntervalRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (cashOutIntervalRef.current) {
        clearTimeout(cashOutIntervalRef.current);
        cashOutIntervalRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []); // Run once on mount


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

  // Set initial rocket position at bottom when component mounts
  useEffect(() => {
    const graphStartX = 40;  // Y-axis position
    const graphEndY = 280;   // X-axis position (bottom of graph)
    // Set initial position immediately without animation
    rocketControls.set({ x: graphStartX, y: graphEndY, opacity: 1, rotate: 0 });
  }, [rocketControls]);

  // Frontend-only game logic - generates random multipliers locally

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

        // Update leaderboard immediately
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

  // Countdown display - frontend-only, controlled by game loop
  // The countdown is now managed directly by the frontend game loop

  // Rocket animation - frontend-only
  // Uses displayMultiplier which is generated locally with random numbers
  // Works consistently using framer-motion
  useEffect(() => {
    // Graph boundaries (consistent across all browsers)
    const graphStartX = 40;  // Y-axis position
    const graphEndX = 380;   // Right edge
    const graphStartY = 20;  // Top edge
    const graphEndY = 280;   // X-axis position (bottom of graph)
    const axisX = graphStartX;
    const axisY = graphEndY;
    // const graphHeight = graphEndY - graphStartY; // Unused - removed for build

    // If not running (cooldown period) or crashed, show rocket at starting position (bottom)
    // All browsers will show the same starting position
    if (!isRunning || isCrashed) {
      // Always reset to bottom position when game is not running
      rocketControls.set({ x: axisX, y: axisY, opacity: 1, rotate: 0 });
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
      rotate: 40, // Rotate 40 degrees clockwise when game starts
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

  // Frontend-only game loop - generates random multipliers and controls game flow
  // All game logic is handled locally in the frontend

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
          <div 
            className="menu-icon" 
            ref={menuIconRef}
            onClick={() => {
              if (menuIconRef.current) {
                const rect = menuIconRef.current.getBoundingClientRect();
                setMenuIconPosition({ top: rect.bottom, left: rect.left });
              }
              setShowSettingsModal(true);
            }}
          >☰</div>
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
    
      <div className="main-content">
        {/* Left Sidebar - Leaderboard */}
        <div className="sidebar">
          <div className="leaderboard-header">
            <span className="trophy">🏆 LEADERBOARD</span>
          </div>
          <div className="leaderboard-table">
            <div className="table-header">
              <div className="header-cell">Player</div>
              <div className="header-cell">Bet {viewInFun ? '(FUN)' : '(INR)'}</div>
              <div className="header-cell">Multiplier</div>
              <div className="header-cell">Win {viewInFun ? '(FUN)' : '(INR)'}</div>
            </div>
            <div className="table-body">
              {(() => {
                // Combine real leaderboard with fake members
                // Real users take priority, then add fake members
                const realUsers = leaderboard.filter(p => !p.isFake);
                const allMembers = [...realUsers, ...fakeMembers];

                // Sort by bet amount descending
                const sortedMembers = [...allMembers].sort((a, b) => {
                  if (a.betAmount && b.betAmount) {
                    return b.betAmount - a.betAmount;
                  }
                  return 0;
                });

                return sortedMembers.map((player, index) => {
                  const isClaimed = player.userId && claimedUserIds.has(player.userId.toString());
                  const hasWinnings = player.winnings && player.winnings > 0;
                  const hasCashedOut = player.cashOutMultiplier !== null && player.cashOutMultiplier !== undefined;
                  const showDash = !player.cashOutMultiplier && player.winnings === 1.00;

                  return (
                    <div
                      key={player.userId || index}
                      className={`table-row ${isClaimed ? 'claimed-highlight' : ''} ${hasCashedOut ? 'cashed-out-row' : ''}`}
                    >
                      <div className="table-cell player-cell leaderboard-player-name">{player.name}</div>
                      <div className="table-cell leaderboard-bet-amount">{player.betAmount ? player.betAmount.toFixed(2) : '0.00'}</div>
                      <div className="table-cell multiplier-cell leaderboard-multiplier">
                        {player.cashOutMultiplier
                          ? `${player.cashOutMultiplier.toFixed(2)}x`
                          : (showDash ? '-' : 'In Play')}
                      </div>
                    <div className={`table-cell winnings-cell ${hasWinnings ? 'leaderboard-winnings-box' : ''}`}>
                      {hasWinnings ? (
                        <span className="winnings-amount">
                          {player.winnings.toFixed(2)} {viewInFun ? 'FUN' : 'INR'}
                          {viewInFun && <span className="fun-icon-small">●</span>}
                        </span>
                      ) : (
                        <span>{showDash ? `1.00 ${viewInFun ? 'FUN' : 'INR'}` : `0.00 ${viewInFun ? 'FUN' : 'INR'}`}</span>
                      )}
                    </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Central Game Area */}
        <div className="game-area">
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
          <div className="graph-container">
            <svg className="graph" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
              {/* Grid Lines */}
              <defs>
                <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#333" strokeWidth="0.3" opacity="0.2" />
                </pattern>
                <pattern id="majorGrid" width="200" height="150" patternUnits="userSpaceOnUse">
                  <path d="M 200 0 L 0 0 0 150" fill="none" stroke="#444" strokeWidth="0.5" opacity="0.4" />
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
              <line x1="40" y1="20" x2="40" y2="280" stroke="#666" strokeWidth="2" className="main-axis" />
              <line x1="40" y1="280" x2="380" y2="280" stroke="#666" strokeWidth="2" className="main-axis" />


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
              <line x1="100" y1="20" x2="100" y2="280" stroke="#555" strokeWidth="1" opacity="0.6" />
              <line x1="160" y1="20" x2="160" y2="280" stroke="#555" strokeWidth="1" opacity="0.6" />
              <line x1="220" y1="20" x2="220" y2="280" stroke="#555" strokeWidth="1" opacity="0.6" />
              <line x1="280" y1="20" x2="280" y2="280" stroke="#555" strokeWidth="1" opacity="0.6" />
              <line x1="340" y1="20" x2="340" y2="280" stroke="#555" strokeWidth="1" opacity="0.6" />

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
                initial={{ x: 40, y: 280, opacity: 1, rotate: 0 }}
                animate={rocketControls}
                className="rocket-graph"
              >
                <defs>
                  {/* Rocket body gradient */}
                  <linearGradient id="rocketBodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="50%" stopColor="#f5f5f5" stopOpacity="1" />
                    <stop offset="100%" stopColor="#e8e8e8" stopOpacity="1" />
                  </linearGradient>
                  {/* Fire gradient */}
                  <radialGradient id="fireGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffff00" stopOpacity="1" />
                    <stop offset="50%" stopColor="#ffaa00" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#ff6600" stopOpacity="0.7" />
                  </radialGradient>
                  {/* Window gradient */}
                  <radialGradient id="windowGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#87ceeb" stopOpacity="1" />
                    <stop offset="70%" stopColor="#4a90e2" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#2e5c8a" stopOpacity="0.8" />
                  </radialGradient>
                </defs>
                <g transform="translate(0, 0) scale(1.5)">
                  {/* Enhanced Yellow Fire */}
                  <g className="rocket-fire">
                    {/* Outer fire glow - largest */}
                    <ellipse cx="0" cy="14" rx="7" ry="10" fill="#ffd700" opacity="0.6">
                      <animate attributeName="ry" values="10;12;10" dur="0.3s" repeatCount="indefinite" />
                      <animate attributeName="rx" values="7;8;7" dur="0.35s" repeatCount="indefinite" />
                    </ellipse>
                    {/* Middle fire layer */}
                    <ellipse cx="0" cy="14" rx="5.5" ry="8" fill="#ffaa00" opacity="0.8">
                      <animate attributeName="ry" values="8;9.5;8" dur="0.25s" repeatCount="indefinite" />
                    </ellipse>
                    {/* Inner bright fire */}
                    <ellipse cx="0" cy="14" rx="4" ry="6" fill="url(#fireGradient)" opacity="1">
                      <animate attributeName="ry" values="6;7;6" dur="0.2s" repeatCount="indefinite" />
                    </ellipse>
                    {/* Core fire */}
                    <ellipse cx="0" cy="14" rx="2.5" ry="4" fill="#ffff00" opacity="1">
                      <animate attributeName="ry" values="4;5;4" dur="0.15s" repeatCount="indefinite" />
                    </ellipse>
                    {/* Fire particles - more dynamic */}
                    <circle cx="-4" cy="16" r="1.8" fill="#ffd700" opacity="0.8">
                      <animate attributeName="cy" values="16;18;16" dur="0.4s" repeatCount="indefinite" />
                      <animate attributeName="cx" values="-4;-5;-4" dur="0.4s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="4" cy="17" r="1.8" fill="#ffd700" opacity="0.8">
                      <animate attributeName="cy" values="17;19;17" dur="0.35s" repeatCount="indefinite" />
                      <animate attributeName="cx" values="4;5;4" dur="0.35s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="-2" cy="18" r="1.2" fill="#ffaa00" opacity="0.7">
                      <animate attributeName="cy" values="18;20;18" dur="0.45s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="2" cy="19" r="1.2" fill="#ffaa00" opacity="0.7">
                      <animate attributeName="cy" values="19;21;19" dur="0.4s" repeatCount="indefinite" />
                    </circle>
                  </g>
                  
                  {/* Enhanced White Rocket Body */}
                  <g className="rocket-body">
                    {/* Main body with gradient */}
                    <path d="M -7 -10 L -3.5 -13 L 3.5 -13 L 7 -10 L 5.5 6 L -5.5 6 Z" 
                          fill="url(#rocketBodyGradient)" 
                          stroke="#d0d0d0" 
                          strokeWidth="0.8" />
                    
                    {/* Nose cone highlight */}
                    <ellipse cx="0" cy="-11" rx="3.5" ry="2" fill="#ffffff" opacity="0.7" />
                    
                    {/* Body segments/rings */}
                    <line x1="-5" y1="-4" x2="5" y2="-4" stroke="#d0d0d0" strokeWidth="0.5" opacity="0.6" />
                    <line x1="-5" y1="0" x2="5" y2="0" stroke="#d0d0d0" strokeWidth="0.5" opacity="0.6" />
                    <line x1="-5" y1="3" x2="5" y2="3" stroke="#d0d0d0" strokeWidth="0.5" opacity="0.6" />
                    
                    {/* Window with gradient and highlight */}
                    <circle cx="0" cy="-2" r="3" fill="url(#windowGradient)" opacity="0.9" />
                    <circle cx="0" cy="-2" r="2.5" fill="#4a90e2" opacity="0.6" />
                    <circle cx="-0.8" cy="-2.5" r="1" fill="#ffffff" opacity="0.4" />
                    
                    {/* Enhanced fins/wings */}
                    {/* Left fin */}
                    <path d="M -5.5 4 L -9 7 L -7.5 8.5 L -5.5 6.5 Z" 
                          fill="url(#rocketBodyGradient)" 
                          stroke="#d0d0d0" 
                          strokeWidth="0.6" />
                    <path d="M -5.5 4 L -7 5.5 L -5.5 6.5 Z" fill="#ffffff" opacity="0.6" />
                    
                    {/* Right fin */}
                    <path d="M 5.5 4 L 9 7 L 7.5 8.5 L 5.5 6.5 Z" 
                          fill="url(#rocketBodyGradient)" 
                          stroke="#d0d0d0" 
                          strokeWidth="0.6" />
                    <path d="M 5.5 4 L 7 5.5 L 5.5 6.5 Z" fill="#ffffff" opacity="0.6" />
                    
                    {/* Side highlights for 3D effect */}
                    <path d="M -7 -10 L -3.5 -13 L -3.5 -8 L -7 -6 Z" fill="#ffffff" opacity="0.3" />
                    <path d="M 7 -10 L 3.5 -13 L 3.5 -8 L 7 -6 Z" fill="#ffffff" opacity="0.3" />
                    
                    {/* Bottom exhaust port */}
                    <ellipse cx="0" cy="6" rx="3" ry="1.5" fill="#2a2a2a" opacity="0.8" />
                    
                    {/* Top antenna/cone detail */}
                    <circle cx="0" cy="-13" r="1" fill="#ffd700" opacity="0.9" />
                    <line x1="0" y1="-13" x2="0" y2="-15" stroke="#ffd700" strokeWidth="1.5" opacity="0.9" />
                    <circle cx="0" cy="-15" r="0.8" fill="#ffd700" opacity="1" />
                  </g>
                </g>
              </motion.g>
            </svg>

            {/* Game Status Overlay */}
            {showStatus && (
              <div className="game-status">
                <div className="status-circle">
                  {showCountdown ? (
                    <>
                      {/* Circular Countdown Animation */}
                      <svg className="countdown-circle" viewBox="0 0 200 200">
                        <defs>
                          <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                          <linearGradient id="countdownGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ffaa00" />
                            <stop offset="50%" stopColor="#ffd700" />
                            <stop offset="100%" stopColor="#ff6b35" />
                          </linearGradient>
                        </defs>
                        {/* Background dashed circle */}
                        <circle
                          cx="100"
                          cy="100"
                          r="85"
                          fill="none"
                          stroke="rgba(255, 255, 255, 0.2)"
                          strokeWidth="4"
                          strokeDasharray="5,5"
                        />
                        {/* Animated progress arc */}
                        <circle
                          className="countdown-progress"
                          cx="100"
                          cy="100"
                          r="85"
                          fill="none"
                          stroke="url(#countdownGradient)"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 85}`}
                          strokeDashoffset={`${2 * Math.PI * 85 * (1 - (5 - smoothCountdown) / 5)}`}
                          filter="url(#glow)"
                          transform="rotate(-90 100 100)"
                        />
                      </svg>
                      <div className="countdown-content">
                        <div className="next-round-text">NEXT ROUND</div>
                        <div className="countdown-separator"></div>
                        <div className="countdown-bets">
                          <span className="bets-label">BETS</span>
                          <span className="bets-number">{bets}</span>
                        </div>
                      </div>
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
                      {/* Crash multiplier value from frontend game loop */}
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
      
      </div>

      {/* Control Bar - Full Width Below Sidebar */}
      <div className="control-bar">
        <div className="control-bar-content">
          {/* Balance Display */}
          <div className="balance-display">
            Balance {balance.toFixed(2)} {viewInFun ? 'FUN' : 'INR'}
          </div>

          {/* AUTO Button */}
          <button 
            className={`auto-btn ${autoMode ? 'active' : ''}`}
            onClick={() => setAutoMode(!autoMode)}
          >
            AUTO
          </button>

          {/* First Betting Slot */}
          <div className="betting-slot">
            {/* Bet Amount Display */}
            <div className="bet-amount-display">
              {betAmount.toFixed(2)} {viewInFun ? 'FUN' : 'INR'}
            </div>
            
            {/* Vertical Separator */}
            <div className="bet-separator"></div>

            {/* Multiplier Input */}
            <div className="multiplier-input-container">
              <div className="multiplier-input">
                <span className="multiplier-dash">-</span>
              </div>
              <button 
                className="multiplier-cancel-btn"
                onClick={() => setAutoMultiplier(null)}
                title="Clear multiplier"
              >
                <span className="close-x-icon"></span>
              </button>
            </div>

            {/* Place Bet Button */}
            <button
              className="place-bet-btn"
              onClick={isRunning && hasPlacedBet ? handleClaim : placeBet}
              disabled={isRunning && !hasPlacedBet}
              title={isRunning && !hasPlacedBet ? 'Betting disabled during game if no bet placed' : ''}
            >
              <div className="bet-btn-line1">PLACE BET</div>
              <div className="bet-btn-line2">(NEXT ROUND)</div>
            </button>
          </div>

          {/* Second Betting Slot */}
          <div className="betting-slot">
            {/* Bet Amount Display */}
            <div className="bet-amount-display">
              {betAmount2.toFixed(2)} {viewInFun ? 'FUN' : 'INR'}
            </div>
            
            {/* Vertical Separator */}
            <div className="bet-separator"></div>

            {/* Multiplier Input */}
            <div className="multiplier-input-container">
              <div className="multiplier-input">
                <span className="multiplier-dash">-</span>
              </div>
              <button 
                className="multiplier-cancel-btn"
                onClick={() => setAutoMultiplier2(null)}
                title="Clear multiplier"
              >
                <span className="close-x-icon"></span>
              </button>
            </div>

            {/* Place Bet Button */}
            <button
              className="place-bet-btn"
              onClick={() => {
                // Place bet with second slot amount
                const originalBet = betAmount;
                setBetAmount(betAmount2);
                placeBet();
                setBetAmount(originalBet);
              }}
              disabled={isRunning && !hasPlacedBet}
              title={isRunning && !hasPlacedBet ? 'Betting disabled during game if no bet placed' : ''}
            >
              <div className="bet-btn-line1">PLACE BET</div>
              <div className="bet-btn-line2">(NEXT ROUND)</div>
            </button>
          </div>
        </div>
      </div>


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
          user={user}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="settings-modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div 
            className="settings-modal" 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `${menuIconPosition.top + 10}px`,
              left: `${menuIconPosition.left}px`,
              transform: 'none'
            }}
          >
            {/* Header */}
            <div className="settings-header">
              <div className="settings-header-icons">
                <div className="settings-hamburger-icon"></div>
                <div className="settings-sound-icon"></div>
              </div>
              <div className="settings-header-tabs">
                <div className="settings-tab active">
                  <span className="settings-gear-icon"></span>
                </div>
                <div className="settings-tab">
                  <span className="settings-book-icon"></span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="settings-content">
              {/* Volume Section */}
              <div className="settings-section">
                <h3 className="settings-section-title">Volume</h3>
                
                {/* Music */}
                <div className="volume-control">
                  <div className="volume-label">Music</div>
                  <div className="volume-controls">
                    <button 
                      className={`volume-mute-btn ${musicMuted ? 'muted' : ''}`}
                      onClick={() => {
                        const newMuted = !musicMuted;
                        setMusicMuted(newMuted);
                        localStorage.setItem('musicMuted', newMuted.toString());
                        // Apply volume change
                        if (!newMuted && musicVolume > 0) {
                          // Unmute - restore volume
                          console.log(`Music unmuted at ${musicVolume}%`);
                        } else {
                          console.log('Music muted');
                        }
                      }}
                    >
                      {musicMuted ? <RxSpeakerOff /> : <HiSpeakerWave />}
                    </button>
                    <div className="volume-slider-container">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={musicVolume}
                        onChange={(e) => {
                          const newVolume = parseInt(e.target.value);
                          setMusicVolume(newVolume);
                          localStorage.setItem('musicVolume', newVolume.toString());
                          // Auto-unmute when volume is increased
                          if (newVolume > 0 && musicMuted) {
                            setMusicMuted(false);
                            localStorage.setItem('musicMuted', 'false');
                          }
                          // Apply volume change
                          console.log(`Music volume set to ${newVolume}%`);
                        }}
                        className="volume-slider"
                        disabled={musicMuted}
                      />
                      <div className="volume-icon-right"></div>
                    </div>
                  </div>
                </div>

                {/* Sound FX */}
                <div className="volume-control">
                  <div className="volume-label">Sound FX</div>
                  <div className="volume-controls">
                    <button 
                      className={`volume-mute-btn ${soundFxMuted ? 'muted' : ''}`}
                      onClick={() => {
                        const newMuted = !soundFxMuted;
                        setSoundFxMuted(newMuted);
                        localStorage.setItem('soundFxMuted', newMuted.toString());
                        // Apply volume change
                        if (!newMuted && soundFxVolume > 0) {
                          // Unmute - restore volume
                          console.log(`Sound FX unmuted at ${soundFxVolume}%`);
                        } else {
                          console.log('Sound FX muted');
                        }
                      }}
                    >
                      {soundFxMuted ? <RxSpeakerOff /> : <HiSpeakerWave />}
                    </button>
                    <div className="volume-slider-container">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={soundFxVolume}
                        onChange={(e) => {
                          const newVolume = parseInt(e.target.value);
                          setSoundFxVolume(newVolume);
                          localStorage.setItem('soundFxVolume', newVolume.toString());
                          // Auto-unmute when volume is increased
                          if (newVolume > 0 && soundFxMuted) {
                            setSoundFxMuted(false);
                            localStorage.setItem('soundFxMuted', 'false');
                          }
                          // Apply volume change
                          console.log(`Sound FX volume set to ${newVolume}%`);
                        }}
                        className="volume-slider"
                        disabled={soundFxMuted}
                      />
                      <div className="volume-icon-right"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Leaderboard Section */}
              <div className="settings-section">
                <h3 className="settings-section-title">Leaderboard</h3>
                <div className="toggle-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={viewInFun}
                      onChange={(e) => {
                        const newValue = e.target.checked;
                        setViewInFun(newValue);
                        localStorage.setItem('viewInFun', newValue.toString());
                        console.log(`View in FUN: ${newValue}`);
                      }}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="toggle-label">View in FUN</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="settings-footer">
              <button 
                className="settings-close-btn"
                onClick={() => setShowSettingsModal(false)}
              >
                <span className="close-x-icon"></span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrashGame;
