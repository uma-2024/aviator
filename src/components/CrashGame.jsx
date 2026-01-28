import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, useAnimation } from "framer-motion";
import { HiSpeakerWave } from "react-icons/hi2";
import { RxSpeakerOff } from "react-icons/rx";
import rocketImage from "../Assets/rocket1.png";
import AuthModal from "./AuthModal/AuthModal.jsx";
import Deposit from "./Deposit/Deposit.jsx";
import {  getCrashHistory, getCurrentUser } from "../services/api.js";
import "./CrashGame.css";
import Loader from "./Loader/Loader.jsx";

const CrashGame = ({ onBackToHome }) => {
  // Fake usernames pool for generating realistic fake members
  const [balance, setBalance] = useState(1000.00);  // User balance
  const [betAmount, setBetAmount] = useState(50.00);  // Current bet amount
  const [hasPlacedBet, setHasPlacedBet] = useState(false);  // Flag to check if bet is placed
  const [isRunning, setIsRunning] = useState(false);  // Game state
  const [multiplier, setMultiplier] = useState(1.0);  // Current multiplier (simulating cashout multiplier)
  // const [userBetInCurrentGame, setUserBetInCurrentGame] = useState(null);  // Store bet info
  const [isGameStarted, setIsGameStarted] = useState(false); // Game state: true when game has started
  const [isCashingOut, setIsCashingOut] = useState(false);   // Track if the user is cashing out
  const [, setGameStartTime] = useState(null);   // Store the game start time
  const [, setCashoutAmount] = useState(0);  // Store the calculated cashout amount
  
  const FAKE_USERNAMES = useMemo(() => [
    'Moc', 'Ume', 'xEk', 'han', 'fop', 'mav', 'Ali', 'Pra', 'Sam', 'Ank',
    'Rah', 'Tom', 'Jer', 'Max', 'Leo', 'Zoe', 'Kim', 'Dan', 'Eva', 'Roy',
    'Ivy', 'Ben', 'Amy', 'Jay', 'Kay', 'Rob', 'Tim', 'Joe', 'Bob', 'Pat'
  ], []);

  // Now FAKE_USERNAMES won't change on each render
  const generateFakeUser = useCallback(() => {
    const baseName = FAKE_USERNAMES[Math.floor(Math.random() * FAKE_USERNAMES.length)];
    const maskLength = Math.floor(Math.random() * 3) + 2; // 2-4 asterisks
    const maskedName = baseName + '*'.repeat(maskLength);

    const betAmount = Math.floor(Math.random() * 900 + 10); // 10-1000
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
  }, [FAKE_USERNAMES]);  // Now `FAKE_USERNAMES` will not trigger re-creation of `generateFakeUser` callback unnecessarily

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
  // const [multiplier, setMultiplier] = useState(1.0);
  const [displayMultiplier, setDisplayMultiplier] = useState(1.0); // smoothed UI multiplier
  const displayMultiplierRef = useRef(1.0); // Track current displayMultiplier value (not stale)
  const [, setRocketVisualMultiplier] = useState(1.0); // Rocket visual multiplier (faster than actual)
  const rocketVisualMultiplierRef = useRef(1.0); // Track rocket visual multiplier
  // const animStartRef = useRef(null);
  const fromMultiplierRef = useRef(1.0);
  const toMultiplierRef = useRef(1.0);
  const rafRef = useRef(null);
  const lastTargetRef = useRef(1.0);
  // const [crashMessage, setCrashMessage] = useState(null); // Message to display
  // const [crashMultiplier, setCrashMultiplier] = useState(null); // Multiplier when crashed
  const [isCrashed, setIsCrashed] = useState(false);
  const isCrashedRef = useRef(false);
  const [roundOver, setRoundOver] = useState(false);
  // const [isRunning, setIsRunning] = useState(false);
  const isRunningRef = useRef(false);
  // const [balance, setBalance] = useState(1000.00);
  // const [betAmount, setBetAmount] = useState(50.00);
  const [betAmount2,] = useState(50.00); // Second betting slot
  const [bets, setBets] = useState(12);
  const [autoMode, setAutoMode] = useState(false);
  const [, setAutoMultiplier] = useState(null);
  const [, setAutoMultiplier2] = useState(null); // Second slot multiplier
  const [, setCountdown] = useState(5);
  const [smoothCountdown, setSmoothCountdown] = useState(5); // For smooth circular animation
  const [currentGameId,] = useState(null);
  const currentGameIdRef = useRef(null);
  // const [pendingParticipants, setPendingParticipants] = useState([]); // Unused - removed for build
  const [showCountdown, setShowCountdown] = useState(false);
  // const [hasPlacedBet, setHasPlacedBet] = useState(false);
  const [, setIsWaitingForGame] = useState(false);
  // const [userBetInCurrentGame, setUserBetInCurrentGame] = useState(null);
  const [showStatus] = useState(true); // Used in JSX, but setter not needed
  const [rocketTrail, setRocketTrail] = useState([]);
  const rocketTrailRef = useRef([]); // Store trail in ref to avoid re-renders every frame
  const trailUpdateCounterRef = useRef(0); // Update trail state only every few frames
  const [showCrashEffect, setShowCrashEffect] = useState(false);
  const [, setCrashPosition] = useState({ x: 0, y: 0 });
  // const [maxMultiplier, setMaxMultiplier] = useState(1.5); // Unused - removed for build
  const [gameHistory, setGameHistory] = useState([1.66, 1.04, 1.24, 7.60, 1.88, 32.21, 3.59, 1.21, 1.86, 3.25].slice(0, 10));
  const [leaderboard,] = useState([]);
  const [claimedUserIds, ] = useState(new Set()); // Track recently claimed users
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
  const [loading, setLoading] = useState(true);

  // Simulate loading delay and hide loader after it completes
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false); // Hide loader after 3 seconds
    }, 2000); // Adjust time as necessary
    return () => clearTimeout(timer); // Clean up timer on component unmount
  }, []);
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
  // const leaderboardInFlightRef = useRef(false);
  // const lastLeaderboardFetchTsRef = useRef(0);
  // const updateLeaderboard = useCallback(async () => {
  //   const gameId = currentGameIdRef.current;
  //   if (!gameId) {
  //     setLeaderboard([]);
  //     return;
  //   }

  //   const now = Date.now();
  //   if (leaderboardInFlightRef.current || now - lastLeaderboardFetchTsRef.current < 1000) {
  //     return;
  //   }
  //   leaderboardInFlightRef.current = true;
  //   lastLeaderboardFetchTsRef.current = now;

  //   try {
  //     const gameData = await getGame(gameId);
  //     if (gameData.success && gameData.data && gameData.data.participants) {
  //       // Transform participants to leaderboard format
  //       const leaderboardData = gameData.data.participants.map((participant) => {
  //         const username = participant.user?.username ||
  //           (participant.user?.email ? participant.user.email.split('@')[0] : 'Anonymous');
  //         // Mask username
  //         const maskedName = username.length > 5
  //           ? username.substring(0, 3) + '*'.repeat(username.length - 3)
  //           : username.substring(0, 2) + '*'.repeat(username.length - 2);

  //         return {
  //           name: maskedName,
  //           amount: participant.betAmount,
  //           userId: participant.user?._id || participant.user,
  //           betAmount: participant.betAmount,
  //           cashOutMultiplier: participant.cashOutMultiplier || null,
  //           winnings: participant.winnings || 0,
  //           isFake: false // Mark as real user
  //         };
  //       });

  //       // Sort by bet amount descending
  //       leaderboardData.sort((a, b) => b.amount - a.amount);
  //       setLeaderboard(leaderboardData);

  //       // Remove highlights for users whose data has been reloaded (they now have cashOutMultiplier)
  //       setClaimedUserIds(prev => {
  //         const newSet = new Set(prev);
  //         leaderboardData.forEach(player => {
  //           // If player has cashOutMultiplier, data has been reloaded, remove highlight
  //           if (player.cashOutMultiplier && player.userId) {
  //             newSet.delete(player.userId.toString());
  //           }
  //         });
  //         return newSet;
  //       });
  //     }
  //   } catch (error) {
  //     console.error('Failed to fetch leaderboard:', error);
  //   } finally {
  //     leaderboardInFlightRef.current = false;
  //   }
  // }, []);

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
  }, [showCountdown, generateFakeUser]); // Run when countdown starts

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
      setRocketVisualMultiplier(1.0);
      rocketVisualMultiplierRef.current = 1.0;
      fromMultiplierRef.current = 1.0;
      toMultiplierRef.current = 1.0;
      lastTargetRef.current = 1.0;
      currentMultiplierRef.current = 1.0;

      // Generate random crash point between 1.1x and 10.0x
      crashPointRef.current = parseFloat((1.1 + Math.random() * 5.9).toFixed(2));
      console.log(`🎲 New round starting - crash point: ${crashPointRef.current}x`);

      // Reset fake members for new round - they'll be added during countdown
      setFakeMembers([]);

      // Clear rocket trail when new round starts
      rocketTrailRef.current = [];
      setRocketTrail([]);
      trailUpdateCounterRef.current = 0;

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
          // Reset rocket to starting position instantly (no animation) before starting game
          const graphStartX = 40;
          const graphEndY = 280;
          rocketControls.set({
            translateX: graphStartX,
            translateY: graphEndY,
            opacity: 1,
            rotate: 0,
            scale: 1
          });
          // Clear trail before new round
          rocketTrailRef.current = [];
          setRocketTrail([]);
          trailUpdateCounterRef.current = 0;

          // Start game
          setIsWaitingForGame(false);
          setIsRunning(true);
          setIsCrashed(false);
          setShowCountdown(false);
          isRunningRef.current = true;
          isCrashedRef.current = false;
          lastUpdateTimeRef.current = performance.now();
          currentMultiplierRef.current = 1.0;
          rocketVisualMultiplierRef.current = 1.0;
          setRocketVisualMultiplier(1.0);

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

        // Start with a medium speed, then progressively slow down as it nears the top (crash point)
        let rocketSpeedFactor = 0.1;  // Medium starting speed
        let speedIncreaseFactor = 0.015;  // Rate of acceleration
        let speedDecreaseFactor = 0.000005; // Rate of deceleration after reaching near the top
        let maxSpeed = 0.01;  // Maximum speed the rocket can reach
        let decelerationThreshold = 0.6;  // 60% of the total path - start slowing down

        // Calculate the normalized progress of the rocket (0 to 1, from bottom to top)
        const normalizedMultiplier = (currentMultiplierRef.current - 1.0) / (crashPointRef.current - 1.0);

        // If rocket is below 60% progress, increase speed normally
        if (normalizedMultiplier < decelerationThreshold) {
          rocketSpeedFactor += speedIncreaseFactor;  // Accelerate until 60%
          rocketSpeedFactor = Math.min(rocketSpeedFactor, maxSpeed);  // Cap the speed
        } else {
          // After 60%, start decelerating very slowly
          rocketSpeedFactor -= speedDecreaseFactor;
          rocketSpeedFactor = Math.max(rocketSpeedFactor, 0);  // Prevent going negative speed
        }

        // Update multiplier with the speed factor
        currentMultiplierRef.current += rocketSpeedFactor * (deltaTime / 16.67); // Normalize to 60fps (16.67ms per frame)

        // Cap the current multiplier to prevent it exceeding the crash point
        const maxMultiplier = crashPointRef.current || 10.0;
        currentMultiplierRef.current = Math.min(currentMultiplierRef.current, maxMultiplier);

        // Update multiplier display state
        const roundedMultiplier = parseFloat(currentMultiplierRef.current.toFixed(2));
        setMultiplier(roundedMultiplier);
        setDisplayMultiplier(roundedMultiplier);
        displayMultiplierRef.current = roundedMultiplier;
        lastTargetRef.current = roundedMultiplier;

        // Check if the rocket has reached or passed the crash point
        if (currentMultiplierRef.current >= crashPointRef.current) {
          // Trigger crash event
          setIsCrashed(true);
          setRoundOver(true);
          setIsRunning(false); // Stop the game loop

          // Move the rocket out of the graph (fly out)
          rocketControls.start({
            translateX: 420, // Move beyond the graph on the X-axis
            translateY: -20, // Move above the graph on the Y-axis
            opacity: 0, // Make it invisible
            rotate: 180,  // Rotate to give the illusion that it's flying away
            scale: 1.5, // Increase the size slightly for the effect
            transition: {
              duration: 1.0, // Duration of the fly away effect
              ease: "easeOut",
            },
          });

          // Show the gradient and multiplier
          setTimeout(() => {
            setIsCrashed(false);  // Reset the crash effect after a delay
            resetGame();
          }, 2000); // Reset the game after 2 seconds
        }

        else {
          // Update the rocket position based on the current multiplier
          updateRocketPosition(normalizedMultiplier);
        }

        // Continue the game loop using requestAnimationFrame for smooth 60fps
        rafRef.current = requestAnimationFrame(gameLoop);
      };

      // Function to update rocket position
      // Update the rocket position based on the current multiplier
      // Function to update rocket position based on the current multiplier
      const updateRocketPosition = (normalizedMultiplier) => {
        const graphStartX = 40;  // Starting X position
        const graphEndX = 380;   // Ending X position
        const graphStartY = 20;  // Starting Y position (bottom of the graph)
        const graphEndY = 280;   // Ending Y position (top of the graph)

        // Apply parabolic progress (y = x²) for a smooth curve
        const parabolicProgress = normalizedMultiplier * normalizedMultiplier;

        // Calculate the X position: rocket moves from left to right smoothly
        const maxXDistance = graphEndX - graphStartX - 20;
        const rocketX = graphStartX + (normalizedMultiplier * maxXDistance * 0.9); // Move the rocket along X axis

        // Calculate the Y position: rocket follows a smooth upward curve (parabola)
        const totalHeight = graphEndY - graphStartY;
        let rocketY = graphEndY - (parabolicProgress * totalHeight);  // Smooth upward curve

        // Ensure the rocket doesn't move beyond the top or bottom of the path
        rocketY = Math.max(graphStartY + 10, Math.min(graphEndY - 10, rocketY));

        // Update the rocket's position using the calculated X and Y
        rocketControls.set({
          translateX: rocketX,
          translateY: rocketY,
          opacity: 1,
          rotate: 40,  // Apply a slight rotation for added realism
        });

        // Track the rocket's trail (store position for the path)
        rocketTrailRef.current.push({ x: rocketX, y: rocketY });

        // If the trail exceeds a certain length, trim it to keep performance in check
        if (rocketTrailRef.current.length > 50) {
          rocketTrailRef.current.shift(); // Remove the first element
        }

        // Update the trail display every few frames (every 3 frames)
        if (trailUpdateCounterRef.current >= 3) {
          setRocketTrail([...rocketTrailRef.current]); // This triggers a re-render
          trailUpdateCounterRef.current = 0; // Reset counter
        } else {
          trailUpdateCounterRef.current++;
        }
      };





      // Function to reset the game
      const resetGame = () => {
        setIsCrashed(false);
        setRoundOver(false);
        setIsRunning(false);
        setMultiplier(1.0);
        setDisplayMultiplier(1.0);
        setRocketVisualMultiplier(1.0);

        // Reset the rocket to starting position
        rocketControls.set({
          translateX: 40, // Reset to bottom-left
          translateY: 280, // Reset to bottom
          opacity: 1, // Make it visible again
          rotate: 0, // No rotation
          scale: 1, // Normal size
        });

        // Reset other game states for the new round
        setCountdown(5);
        setSmoothCountdown(5);
        setGameHistory([1.66, 1.04, 1.24, 7.60, 1.88, 32.21, 3.59, 1.21, 1.86, 3.25].slice(0, 10)); // Example history
        setFakeMembers([]); // Clear fake members for the new round
        setBets(12); // Reset the bets
        setShowCountdown(true);
        setShowCrashEffect(false);

        // Start new round after a short delay
        setTimeout(() => {
          startNewRound(); // Restart the round
        }, 1000); // Delay for a second before starting the new round
      };






      // Start RAF loop
      rafRef.current = requestAnimationFrame(gameLoop);
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
  }, [rocketControls]); // Run once on mount


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
    rocketControls.set({ translateX: graphStartX, translateY: graphEndY, opacity: 1, rotate: 0 });
  }, [rocketControls]);

  // Frontend-only game logic - generates random multipliers locally
  const placeBet = async () => {
    if (balance >= betAmount) {
      // Proceed with placing the bet if the user has enough balance
      setBalance(prevBalance => prevBalance - betAmount); // Deduct bet amount from balance
      setHasPlacedBet(true); // Mark bet as placed
      setIsGameStarted(true); // Set game started to true
      setIsCashingOut(false); // Reset cashing out status
      setGameStartTime(Date.now()); // Set start time for the game
    } else {
      alert('Insufficient balance');
    }
  };
  
  const handleCashOut = () => {
    if (!hasPlacedBet || !isGameStarted) {
      alert('You must place a bet before you can cash out.');
      return;
    }
  
    setIsCashingOut(true);  // Trigger cashing out status
    const winnings = betAmount * displayMultiplier; // Calculate the winnings based on the multiplier
    setCashoutAmount(winnings);  // Store the cashout amount
  
    // Update balance after cashing out
    setBalance(prevBalance => prevBalance + winnings);
  
    // Optional: Trigger some UI feedback on successful cashout
    alert(`You cashed out ${winnings.toFixed(2)} FUN at a multiplier of ${displayMultiplier.toFixed(2)}x`);
    
    setHasPlacedBet(false);  // Reset the bet status after cashout
    setIsGameStarted(false);  // Reset the game state after cashout
  };
  

  // Function to draw the rocket trail path using stored positions
const drawRocketTrail = () => {
  const points = rocketTrail;

  // Ensure there are enough points to draw a path
  if (points.length < 2) return null; // Need at least 2 points to draw a path

  // Create a path that connects the rocket's positions
  let pathData = `M ${points[0].x} ${points[0].y}`; // Move to the first point

  for (let i = 1; i < points.length; i++) {
    const cp1x = points[i - 1].x + (points[i].x - points[i - 1].x) * 0.5; // Control point 1 X
    const cp1y = points[i - 1].y + (points[i].y - points[i - 1].y) * 0.5; // Control point 1 Y
    pathData += ` Q ${cp1x} ${cp1y}, ${points[i].x} ${points[i].y}`; // Quadratic Bezier curve
  }

  // Ensure pathData is valid
  if (!pathData || pathData.length === 0) {
    console.error("Path data is invalid:", pathData);
    return null;
  }

  return (
    <g>
      {/* Main bright trail path */}
      <path
        d={pathData}
        fill="none"
        stroke="url(#trailGradient)" // Gradient for the trail (you already have this)
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="1"
      />
    </g>
  );
};






  // const adjustBetAmount = (amount) => {
  //   const newAmount = betAmount + amount;
  //   if (newAmount >= 0) {
  //     setBetAmount(newAmount);
  //   }
  // };

  // const handleClaim = async () => {
  //   if (!user || !currentGameId || !hasPlacedBet || !userBetInCurrentGame) {
  //     return;
  //   }

  //   try {
  //     const result = await claimWinnings(currentGameId, user._id || user.id, multiplier);

  //     if (result.success) {
  //       // Update balance
  //       if (result.data && result.data.user) {
  //         setBalance(result.data.user.balance);
  //       }

  //       alert(`Claimed ${result.data.bet.winnings.toFixed(2)} INR at ${multiplier.toFixed(2)}x`);
  //       setHasPlacedBet(false);
  //       setUserBetInCurrentGame(null);

  //       // Highlight this user's row
  //       const userId = user._id || user.id;
  //       setClaimedUserIds(prev => {
  //         const newSet = new Set(prev);
  //         newSet.add(userId.toString());
  //         return newSet;
  //       });

  //       // Update leaderboard immediately
  //       // Highlight will be removed automatically when data is reloaded in updateLeaderboard
  //       setTimeout(() => {
  //         updateLeaderboard();
  //       }, 300);
  //     }
  //   } catch (error) {
  //     console.error('Failed to claim winnings:', error);
  //     alert(error.message || 'Failed to claim winnings');
  //   }
  // };

  // Countdown display - frontend-only, controlled by game loop
  // The countdown is now managed directly by the frontend game loop

  // Rocket animation - frontend-only
  // Uses displayMultiplier which is generated locally with random numbers
  // Works consistently using framer-motion
  useEffect(() => {
    // Graph boundaries (consistent across all browsers)
    const graphStartX = 40;  // Y-axis position
    // const graphEndX = 380;   // Right edge
    // const graphStartY = 20;  // Top edge
    const graphEndY = 280;   // X-axis position (bottom of graph)
    const axisX = graphStartX;
    const axisY = graphEndY;
    // const graphHeight = graphEndY - graphStartY; // Unused - removed for build

    // If not running (cooldown period) or crashed, show rocket at starting position (bottom)
    // All browsers will show the same starting position
    if (!isRunning || isCrashed) {
      // Always reset to bottom position when game is not running
      // Use set() to instantly position without animation to prevent "coming from behind" effect
      rocketControls.set({
        translateX: axisX,
        translateY: axisY,
        opacity: isCrashed ? 0 : 1, // Hide if crashed, show if just waiting
        rotate: 0,
        scale: 1
      });
      // Stop any ongoing animations to prevent unwanted movement
      rocketControls.stop();
      // Clear trail when rocket resets to initial position
      rocketTrailRef.current = [];
      setRocketTrail([]);
      trailUpdateCounterRef.current = 0;
      return;
    }

    // ✅ Rocket moves at speed matching Y-axis
    // Rocket visual movement matches Y-axis scrolling speed
    // Use displayMultiplier directly to match Y-axis speed
    const currentMultiplier = displayMultiplier;

    // const fixedMax = 10; // Fixed scale: 1.0 to 10 (for Y-axis calculations)

    // Calculate rocket Y position with positive upward parabola path
    // Rocket moves upward in a smooth parabolic curve
    // Y-axis only changes when rocket can't match multiplier (reaches near top)
    // const getRocketYPosition = (multiplier) => {
    //   if (multiplier <= 1.0) return axisY; // Bottom at 1.0x

    //   const topY = graphStartY; // 20
    //   const totalHeight = axisY - topY; // 280 - 20 = 260
    //   const maxMultiplier = 10.0;

    //   // Normalize multiplier (0 to 1)
    //   const normalizedMultiplier = (multiplier - 1.0) / (maxMultiplier - 1.0);

    //   // Positive upward parabola: y = x² (rocket rises faster as multiplier increases)
    //   const parabolicProgress = normalizedMultiplier * normalizedMultiplier;

    //   // Calculate Y position using pure parabolic curve
    //   // Rocket moves upward smoothly in parabolic path
    //   const yPosition = axisY - (parabolicProgress * totalHeight);

    //   return Math.max(graphStartY + 10, Math.min(axisY - 10, yPosition));
    // };

    // Calculate rocket Y position first to determine if Y-axis needs to scroll
    // const rocketYPos = getRocketYPosition(currentMultiplier);

    // Y-axis changes very fast with specific max values for each line
    // Line 1 (bottom): max 2.0x, Line 2: max 4.0x, Line 3: max 6.0x, Line 4: max 8.0x, Line 5: max 10.0x
    // Use rocketVisualMultiplier for faster Y-axis scrolling
    const lineMaxValues = [2.0, 4.0, 6.0, 8.0, 10.0]; // Max values for each line (5 lines)
    const needsScrolling = currentMultiplier > 2.0;

    // Dynamic scrolling Y-axis calculation (Real Aviator style)
    // Y-axis scrolls very fast using rocketVisualMultiplier
    const tickStep = 0.1;
    const totalTicks = 6;
    // const tickGapPx = (graphEndY - graphStartY) / (totalTicks - 1); // ~52px per tick

    let adjustedBaseTick;
    let ticks = [];

    if (!needsScrolling) {
      // Fixed mode: show fixed ticks (1.0x, 1.1x, 1.2x, 1.3x, 1.4x, 1.5x) when multiplier <= 2.0x
      // Bottom line stays at 1.0x and never goes above 2.0x
      adjustedBaseTick = 1.0;
      for (let i = 0; i < totalTicks; i++) {
        ticks.push(1.0 + (i * tickStep));
      }
    } else {
      // Dynamic scrolling mode: scroll Y-axis very fast when multiplier exceeds 2.0x
      // First tick is ALWAYS 1.0x (fixed at bottom)
      // Each line has its own maximum value
      const baseTick = Math.floor(currentMultiplier / tickStep) * tickStep;
      adjustedBaseTick = Math.max(1.0, baseTick - tickStep);

      // Always start with 1.0x as first tick (bottom line never goes above 2.0x)
      ticks.push(1.0);

      // Generate remaining ticks dynamically (5 ticks above 1.0x)
      // Each line is limited to its specific maximum value
      const dynamicTicks = totalTicks - 1; // 5 ticks above 1.0x
      const startTick = Math.max(1.1, adjustedBaseTick + tickStep);
      for (let i = 0; i < dynamicTicks; i++) {
        const tickValue = startTick + (i * tickStep);
        // Limit each line to its specific maximum value
        const maxValue = lineMaxValues[i] || 10.0; // Line index 0 = second line (max 2.0), index 1 = third line (max 4.0), etc.
        ticks.push(parseFloat(Math.min(tickValue, maxValue).toFixed(1)));
      }
    }

    // Calculate rocket position - curved path from the start (like in the image)
    // Both X and Y must progress together smoothly for proper curved path
    // const maxXDistance = graphEndX - graphStartX - 20;

    // Use same multiplier scale for both X and Y to ensure synchronized movement
    // const maxMultiplier = 10.0;
    // const normalizedMultiplier = Math.min((currentMultiplier - 1.0) / (maxMultiplier - 1.0), 1.0);

    // Positive upward parabola: y = x² (rocket rises faster as multiplier increases)
    // Use this for both X and Y to create smooth curved path
    // const parabolicProgress = normalizedMultiplier * normalizedMultiplier;

    // X position: curved path from start (positive parabola)
    // Rocket moves right and curves upward simultaneously
    // const xProgress = normalizedMultiplier; // Use normalized multiplier for X progression
    // const curveFactor = xProgress * xProgress; // Quadratic curve factor (positive parabola)
    // const linearFactor = xProgress; // Linear factor

    // Combine both factors to create smooth curve from start
    // More weight on curve factor to make it curve from beginning (positive upward parabola)
    // const curvedProgress = linearFactor * 0.3 + curveFactor * 0.7;

    // X position follows curved path from the start (positive parabola)
    // const rocketX = axisX + (curvedProgress * maxXDistance * 0.9);

    // Y position: calculated using same parabolic progress for synchronized movement
    // let finalRocketY = getRocketYPosition(currentMultiplier);

    // // Keep rocket at starting position if multiplier is less than 1.0
    // if (currentMultiplier < 1.0) {
    //   finalRocketY = axisY;
    // }

    // Constrain to graph bounds (consistent across all browsers)
    // const minY = graphStartY + 10;
    // const maxY = graphEndY - 10;
    // finalRocketY = Math.max(minY, Math.min(maxY, finalRocketY));

    // Rocket trail is now updated in gameLoop() using refs for performance
    // This useEffect only syncs trail state when needed (not every frame)
    // Trail updates are optimized to avoid heavy re-renders

    // Rocket movement is now handled ONLY in gameLoop() using requestAnimationFrame
    // This useEffect only handles trail updates and Y-axis calculations
    // Rocket position is updated directly in gameLoop for perfect synchronization (60fps)
    // No rocket movement here to avoid double updates and render-dependent lag
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

      // Calculate crash Y position using same parabolic path as rocket
      const getCrashYPosition = (multiplier) => {
        if (multiplier <= 1.0) return axisY;

        const topY = graphStartY; // 20
        const totalHeight = axisY - topY; // 280 - 20 = 260
        const maxMultiplier = 10.0;

        // Normalize multiplier (0 to 1)
        const normalizedMultiplier = (multiplier - 1.0) / (maxMultiplier - 1.0);

        // Positive upward parabola: y = x²
        const parabolicProgress = normalizedMultiplier * normalizedMultiplier;

        // Calculate Y position using parabolic curve
        const yPosition = axisY - (parabolicProgress * totalHeight);

        return Math.max(graphStartY + 10, Math.min(axisY - 10, yPosition));
      };

      // Calculate crash position - positive upward parabola (same as rocket)
      const maxXDistance = graphEndX - graphStartX - 20;
      const xProgress = Math.min((finalMultiplier - 1.0) / (fixedMax - 1.0), 1.0);

      // Positive upward parabola
      const baseX = axisX + (xProgress * maxXDistance * 0.85);
      const parabolicCurve = xProgress * xProgress * 25; // Parabolic curve (x²) outward
      const crashX = baseX + parabolicCurve;

      // Y position: smooth upward curve
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
        translateX: crashX,
        translateY: crashY,
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
        // Reset rocket to starting position instantly (no animation) after crash animation
        // This prevents the "coming from behind" effect
        const graphStartX = 40;
        const graphEndY = 280;
        // Use set() to instantly reset without any animation
        rocketControls.set({
          translateX: graphStartX,
          translateY: graphEndY,
          opacity: 0, // Keep hidden until new round starts
          rotate: 0,
          scale: 1
        });
        // Clear trail immediately
        rocketTrailRef.current = [];
        setRocketTrail([]);
        trailUpdateCounterRef.current = 0;
        // Stop any ongoing animations
        rocketControls.stop();
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
      {loading && <Loader />}
      {!loading && (
        <>
          {/* Header */}

          <div className="header">
            <div className="header-left">
              {onBackToHome && (
                <div
                  className="back-icon"
                  onClick={onBackToHome}
                  title="Back to Home"
                >←</div>
              )}
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
            <div className="game-title">
              <span className="logo-space">Pro</span>
             
                <span className="ogo-space">Aviator</span>
             
            </div>

            <div className="header-right">
              {user ? (
                <div className="user-info">
                  <span className="username">{user.username || (user.email && user.email.split('@')[0])}</span>
                  <span className="balance">₹{Number(balance.toFixed(2))}</span>
                  <button className="deposit-btn" onClick={openDepositModal}>Deposit</button>
                  <button className="logout-btn" onClick={handleLogout}>Logout</button>
                </div>
              ) : (
                <div className="auth-buttons" style={{ display: 'none' }}>
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
                          <div className="table-cell multiplier-cell leaderboard-multiplier">
                            {player.cashOutMultiplier
                              ? `${player.cashOutMultiplier.toFixed(2)}x`
                              : (showDash ? '-' : '-')}
                          </div>
                          {/* Combined Bet/Win column - shows bet amount initially, winnings after cash out */}
                          <div className={`table-cell ${hasWinnings && hasCashedOut ? 'leaderboard-winnings-box' : ''} leaderboard-bet-amount`}>
                            {hasCashedOut && hasWinnings ? (
                              <span className="winnings-amount">
                                {player.winnings.toFixed(2)} FUN
                                <span className="fun-icon-small">●</span>
                              </span>
                            ) : (
                              <span>{player.betAmount ? `${player.betAmount.toFixed(2)} FUN` : `0.00 FUN`}</span>
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
                    {/* Trail gradient - faint at start, bright yellow-orange at end (near crash point) */}
                    <defs>
  {/* Glow filter for rocket trail */}
  <filter id="trailGlow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
    <feMerge>
      <feMergeNode in="coloredBlur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>

  {/* Gradient for the trail (from faint to bright yellow-orange) */}
  <linearGradient id="trailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stopColor="#ffaa00" stopOpacity="1" />
    <stop offset="30%" stopColor="#ff8800" stopOpacity="1" />
    <stop offset="60%" stopColor="#ff8800" stopOpacity="1" />
    <stop offset="100%" stopColor="#ffaa00" stopOpacity="1" />
  </linearGradient>
</defs>


                    {/* Glow gradient for trail halo effect */}
                    <linearGradient id="trailGlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ffaa00" stopOpacity="0.1" />
                      <stop offset="50%" stopColor="#ff8800" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#ffaa00" stopOpacity="0.3" />
                    </linearGradient>
                    {/* Enhanced glow filter for trail halo - subtle luminous effect */}
                    <filter id="trailGlow" x="-50%" y="-50%" width="100%" height="100%">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <radialGradient id="trailGradientRadial" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ff6b35" />
                      <stop offset="100%" stopColor="#ffaa00" />
                    </radialGradient>
                    {/* Warm glowing orb gradient - yellow-white core to orange/yellow/red */}
                    <radialGradient id="crashGradient" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
                      <stop offset="15%" stopColor="#ffff00" stopOpacity="0.3" />
                      <stop offset="30%" stopColor="#ffaa00" stopOpacity="0.3" />
                      <stop offset="50%" stopColor="#ff6b35" stopOpacity="0.3" />
                      <stop offset="70%" stopColor="#ff4444" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#cc0000" stopOpacity="0.3" />
                    </radialGradient>
                    {/* Outer glow gradient for bloom effect */}
                    {/* <radialGradient id="crashOuterGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffaa00" stopOpacity="0.2" />
                      <stop offset="50%" stopColor="#ff6b35" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#cc0000" stopOpacity="0.2" />
                    </radialGradient> */}
                  </defs>

                  {/* Grid Background */}
                  <rect width="400" height="300" fill="url(#grid)" />
                  <rect width="400" height="300" fill="url(#majorGrid)" />

                  {/* Main Axes */}
                  <line x1="40" y1="20" x2="40" y2="280" stroke="#666" strokeWidth="2" className="main-axis" />
                  <line x1="40" y1="280" x2="380" y2="280" stroke="#666" strokeWidth="2" className="main-axis" />


                  {/* Y-axis grid lines - 1.0x always fixed at bottom, then dynamic scrolling */}
                  {(() => {
                    const graphStartY = 20;
                    const graphEndY = 280;
                    const tickStep = 0.1;
                    const totalTicks = 6;
                    const tickGapPx = (graphEndY - graphStartY) / (totalTicks - 1);
                    const lineMaxValues = [2.0, 4.0, 6.0, 8.0, 10.0]; // Max values: Line 1=2.0x, Line 2=4.0x, Line 3=6.0x, Line 4=8.0x, Line 5=10.0x
                    const needsScrolling = displayMultiplier > 2.0;

                    // Calculate ticks based on multiplier (use displayMultiplier for fast scrolling)
                    let ticks = [];
                    if (!needsScrolling) {
                      // Fixed mode: always show 1.0x to 1.5x when multiplier <= 2.0x
                      for (let i = 0; i < totalTicks; i++) {
                        ticks.push(1.0 + (i * tickStep));
                      }
                    } else {
                      // Dynamic scrolling mode: 1.0x always fixed at bottom
                      // Use displayMultiplier for fast Y-axis scrolling
                      const baseTick = Math.floor(displayMultiplier / tickStep) * tickStep;
                      const adjustedBaseTick = Math.max(1.0, baseTick - tickStep);

                      // First tick is ALWAYS 1.0x (fixed at bottom, never goes above 2.0x)
                      ticks.push(1.0);

                      // Generate remaining ticks dynamically (5 ticks above 1.0x)
                      // Each line is limited to its specific maximum value
                      const dynamicTicks = totalTicks - 1;
                      const startTick = Math.max(1.1, adjustedBaseTick + tickStep);
                      for (let i = 0; i < dynamicTicks; i++) {
                        const tickValue = startTick + (i * tickStep);
                        // Limit each line to its specific maximum value
                        const maxValue = lineMaxValues[i] || 10.0; // Line index 0 = second line (max 2.0), index 1 = third line (max 4.0), etc.
                        ticks.push(parseFloat(Math.min(tickValue, maxValue).toFixed(1)));
                      }
                    }

                    // Calculate Y position for each tick
                    // Bottom (graphEndY) = lowest value, Top (graphStartY) = highest value
                    const getYPosition = (index) => {
                      // index 0 (lowest value, always 1.0x) goes to bottom (graphEndY)
                      // index totalTicks-1 (highest value) goes to top (graphStartY)
                      return graphEndY - (tickGapPx * index);
                    };

                    return ticks.map((tick, index) => {
                      const yPosition = getYPosition(index);
                      return (
                        <line
                          key={`y-grid-${tick.toFixed(1)}`}
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

                  {/* Y-axis labels (Multiplier) - 1.0x always fixed at bottom, then dynamic scrolling */}
                  {(() => {
                    const graphStartY = 20;
                    const graphEndY = 280;
                    const tickStep = 0.1;
                    const totalTicks = 6;
                    const tickGapPx = (graphEndY - graphStartY) / (totalTicks - 1);
                    const lineMaxValues = [2.0, 4.0, 6.0, 8.0, 10.0]; // Max values: Line 1=2.0x, Line 2=4.0x, Line 3=6.0x, Line 4=8.0x, Line 5=10.0x
                    const needsScrolling = displayMultiplier > 2.0;

                    // Calculate ticks based on multiplier (use displayMultiplier for fast scrolling)
                    let ticks = [];
                    if (!needsScrolling) {
                      // Fixed mode: always show 1.0x to 1.5x (1.0x always at bottom) when multiplier <= 2.0x
                      for (let i = 0; i < totalTicks; i++) {
                        ticks.push(1.0 + (i * tickStep));
                      }
                    } else {
                      // Dynamic scrolling mode: 1.0x ALWAYS fixed at bottom
                      // Use displayMultiplier for fast Y-axis scrolling
                      const baseTick = Math.floor(displayMultiplier / tickStep) * tickStep;
                      const adjustedBaseTick = Math.max(1.0, baseTick - tickStep);

                      // First tick is ALWAYS 1.0x (fixed at bottom, never goes above 2.0x)
                      ticks.push(1.0);

                      // Generate remaining ticks dynamically (5 ticks above 1.0x)
                      // Each line is limited to its specific maximum value
                      const dynamicTicks = totalTicks - 1;
                      const startTick = Math.max(1.1, adjustedBaseTick + tickStep);
                      for (let i = 0; i < dynamicTicks; i++) {
                        const tickValue = startTick + (i * tickStep);
                        // Limit each line to its specific maximum value
                        const maxValue = lineMaxValues[i] || 10.0; // Line index 0 = second line (max 2.0), index 1 = third line (max 4.0), etc.
                        ticks.push(parseFloat(Math.min(tickValue, maxValue).toFixed(1)));
                      }
                    }

                    // Calculate Y position for each tick
                    // Bottom (graphEndY) = lowest value, Top (graphStartY) = highest value
                    const getYPosition = (index) => {
                      // index 0 (lowest value, always 1.0x) goes to bottom (graphEndY)
                      // index totalTicks-1 (highest value) goes to top (graphStartY)
                      return graphEndY - (tickGapPx * index);
                    };

                    return ticks.map((tick, index) => {
                      const yPosition = getYPosition(index);
                      const tickValue = parseFloat(tick.toFixed(1));
                      return (
                        <text
                          key={`y-label-${tickValue}`}
                          x="5"
                          y={yPosition + 4}
                          className="axis-label"
                          style={{
                            fontSize: '12px',
                            opacity: 1,
                            fontWeight: 'normal'
                          }}
                        >
                          {tickValue.toFixed(1)}x
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
                  <svg className="graph" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
  {/* Background grid */}
  <rect width="400" height="300" fill="url(#grid)" />
  <rect width="400" height="300" fill="url(#majorGrid)" />

  {/* Rocket Path (trail) */}
  {rocketTrail.length >= 2 && isRunning && drawRocketTrail()}

  {/* Other game elements like the rocket */}
  <motion.g
    initial={{ translateX: 40, translateY: 280, opacity: 1, rotate: 0 }}
    animate={rocketControls}
    className="rocket-graph"
  >
    <image
      href={rocketImage}
      x="-60"
      y="-80"
      width="120"
      height="160"
      preserveAspectRatio="xMidYMid meet"
      style={{ transformOrigin: 'center center' }}
    />
  </motion.g>

  {/* Other SVG elements */}
</svg>



                  {/* Crash Effect - Single Radial Gradient Orb */}
                  {showCrashEffect && (
                    <circle
                      cx="200"  // Center of the graph width (assuming 400px wide graph)
                      cy="150"  // Center of the graph height (assuming 300px high graph)
                      r="100"
                      fill="url(#crashGradient)"
                      opacity="1"
                      className="crash-glow"
                    />
                  )}

                  {/* Animated Rocket */}
                  <motion.g
                    initial={{ translateX: 40, translateY: 280, opacity: 1, rotate: 0 }}
                    animate={rocketControls}
                    className="rocket-graph"
                  >
                    <image
                      href={rocketImage}
                      x="-60"
                      y="-80"
                      width="120"
                      height="160"
                      preserveAspectRatio="xMidYMid meet"
                      style={{ transformOrigin: 'center center' }}
                    />
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
                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                <feMerge>
                                  <feMergeNode in="coloredBlur" />
                                  <feMergeNode in="SourceGraphic" />
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
                              strokeWidth="8"
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
                              strokeWidth="12"
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
                          <div className="crash-text">Flew Away</div>
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
                    <span className="multiplier-line">|</span>
                    <span className="multiplier-dash">---</span>
                    <span className="multiplier-line">|</span>
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
                {!isGameStarted && (
        <button
          className="place-bet-btn"
          onClick={placeBet}
          disabled={isRunning || hasPlacedBet}
          title={isRunning || hasPlacedBet ? 'Betting disabled during game if no bet placed' : ''}
        >
          <div className="bet-btn-line1">PLACE BET</div>
          <div className="bet-btn-line2">(NEXT ROUND)</div>
        </button>
      )}

      {/* Show Cash Out Button if game is running and bet has been placed */}
      {isGameStarted && hasPlacedBet && !isCashingOut && (
        <button
        className="cash-bet-btn"
          onClick={handleCashOut}
          disabled={!isGameStarted || isCashingOut || !hasPlacedBet}
          title={!isGameStarted || isCashingOut || !hasPlacedBet ? 'You must place a bet and wait for the game to start before cashing out' : ''}
        >
          {isCashingOut ? 'Cashing Out...' : 'Cash Out'}
        </button>
      )}
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
                    <span className="multiplier-line">|</span>
                    <span className="multiplier-dash">---</span>
                    <span className="multiplier-line">|</span>

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
        </>
      )}
    </div>
  );
};

export default CrashGame;
