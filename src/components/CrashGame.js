import React, { useState, useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import rocketGif from "../Assets/Rocket.gif";
import "./CrashGame.css";

const CrashGame = () => {
  const [multiplier, setMultiplier] = useState(1.0);
  const [isCrashed, setIsCrashed] = useState(false);
  const [roundOver, setRoundOver] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [balance, setBalance] = useState(1000.00);
  const [betAmount, setBetAmount] = useState(1.00);
  const [bets, setBets] = useState(12);
  const [countdown, setCountdown] = useState(5);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showStatus, setShowStatus] = useState(true);
  const [rocketTrail, setRocketTrail] = useState([]);
  const [showCrashEffect, setShowCrashEffect] = useState(false);
  const [crashPosition, setCrashPosition] = useState({ x: 0, y: 0 });
  const [maxMultiplier, setMaxMultiplier] = useState(1.5);
  const [gameHistory, setGameHistory] = useState([1.66, 1.04, 1.24, 7.60, 1.88, 32.21, 3.59, 1.21, 1.86, 3.25]);
  const [leaderboard, setLeaderboard] = useState([
    { name: "Yvy****", amount: 100.00 },
    { name: "Eot*** **", amount: 60.00 },
    { name: "wak*", amount: 50.00 },
    { name: "Elu*", amount: 50.00 },
    { name: "48********", amount: 40.00 },
    { name: "16********", amount: 40.00 },
    { name: "Yvy****", amount: 40.00 },
    { name: "16********", amount: 30.00 },
    { name: "gor** ****", amount: 30.00 },
    { name: "Uro*** **", amount: 4.00 }
  ]);
  const rocketControls = useAnimation();

  // Example crash point (from backend later)
  const crashPoint = useRef(Math.random() * 5 + 1.2);

  // Set initial rocket position at (0,0) when component mounts
  useEffect(() => {
    const graphStartX = 40;  // Y-axis position
    const graphEndY = 280;   // X-axis position
    rocketControls.set({ x: graphStartX, y: graphEndY });
  }, [rocketControls]);

  const startGame = () => {
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
  };

  const startCountdown = () => {
    setShowCountdown(true);
    setCountdown(5);
    
    // Reset rocket to (0,0) when starting countdown
    const graphStartX = 40;  // Y-axis position
    const graphEndY = 280;   // X-axis position
    rocketControls.set({ x: graphStartX, y: graphEndY });
  };

  const placeBet = () => {
    if (balance >= betAmount) {
      setBalance(prev => prev - betAmount);
      setBets(prev => prev + 1);
      if (!isRunning && !showCountdown) {
        startCountdown();
      }
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
        
        // Rocket position (parabolic path from 0,0 axis intersection)
        const progress = Math.min(t / 12, 1); // Progress from 0 to 1 over 12 seconds (much slower)
        
        // Start from axis intersection (0,0) - bottom left of graph area
        const axisX = graphStartX; // Y-axis position (x=40)
        const axisY = graphEndY;   // X-axis position (y=280)
        
        // Dynamic Y-axis scaling based on current max multiplier
        const currentMaxMultiplier = Math.max(maxMultiplier, 1.5); // Start with base max
        const graphHeight = graphEndY - graphStartY; // Total graph height
        
        // Parabola equation: y = ax² (opening upward from origin)
        const parabolaA = 0.5; // Controls the steepness of the parabola
        const maxX = graphEndX - graphStartX - 20; // Maximum X distance
        
        // Calculate parabolic path from axis intersection
        const rocketX = axisX + progress * maxX; // Moves from axis to right
        const normalizedX = progress * maxX; // Normalize x to graph coordinates
        
        // Calculate multiplier based on time progression (slow growth)
        // This ensures slow multiplier growth as rocket moves
        const timeMultiplier = 1 + (t * 0.08) ** 1.5; // Growth curve (much slower)
        
        // Update max multiplier for dynamic Y-axis scaling
        if (timeMultiplier > maxMultiplier) {
          setMaxMultiplier(Math.ceil(timeMultiplier * 1.2)); // Add 20% buffer
        }
        
        const calculatedMultiplier = timeMultiplier;
        
        // Calculate rocket Y position to exactly match the orange multiplier value
        // When multiplier = 1.0x: rocket at Y-axis (y = 280)
        // When multiplier = currentMax: rocket at top (y = 20)
        const multiplierRange = currentMaxMultiplier - 1.0; // Range from 1.0x to current max
        const multiplierProgress = (calculatedMultiplier - 1.0) / multiplierRange; // 0 to 1
        const rocketY = axisY - (multiplierProgress * graphHeight); // Direct mapping
        
        // Keep parabolic X movement but use exact multiplier-based Y position
        const parabolaY = parabolaA * Math.pow(normalizedX, 2) / 200; // For X movement only
        let finalRocketY = rocketY; // Use exact multiplier-based Y position
        
        // Ensure rocket Y position exactly matches the orange multiplier value
        // This makes the rocket position = orange multiplier position on Y-axis
        const exactY = 285 - ((calculatedMultiplier - 1.0) / (currentMaxMultiplier - 1.0)) * 240;
        finalRocketY = exactY;
        
        // Update Y-axis labels based on current multiplier value
        // This ensures Y-axis always shows appropriate range for current multiplier
        const newMaxMultiplier = Math.max(calculatedMultiplier * 1.5, 1.5); // Show 50% above current
        if (newMaxMultiplier > maxMultiplier) {
          setMaxMultiplier(newMaxMultiplier);
        }
        
        // Update multiplier based on rocket position
        setMultiplier(parseFloat(calculatedMultiplier.toFixed(2)));
        
        // Keep rocket visible on screen - limit Y position to stay within graph bounds
        const minY = graphStartY + 10; // Minimum Y (top of graph + small margin)
        const maxY = graphEndY - 10;   // Maximum Y (bottom of graph - small margin)
        finalRocketY = Math.max(minY, Math.min(maxY, finalRocketY));
        
        // Update rocket trail
        setRocketTrail(prev => [...prev.slice(-20), { x: rocketX, y: finalRocketY, time: t }]);
        
        if (calculatedMultiplier >= crashPoint.current) {
          setIsCrashed(true);
          setIsRunning(false);
          setMultiplier(parseFloat(crashPoint.current.toFixed(2)));
          setGameHistory(prev => [parseFloat(crashPoint.current.toFixed(2)), ...prev.slice(0, 9)]);
          setShowStatus(true);
          
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
            transition: { duration: 0.8 } 
          });
        }
      }, 100);
    }

    return () => clearInterval(interval);
  }, [isRunning, isCrashed, rocketControls]);

  return (
    <div className="space-x1-container">
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <div className="menu-icon">☰</div>
          <div className="volume-icon">🔊</div>
        </div>
        <div className="game-title">SPACE X1</div>
        <div className="game-history">
          {gameHistory.map((result, index) => (
            <span 
              key={index} 
              className={`history-item ${result > 10 ? 'highlight' : ''}`}
            >
              {result.toFixed(2)}x
            </span>
          ))}
        </div>
        <div className="refresh-icon">↻</div>
      </div>

      <div className="main-content">
        {/* Left Sidebar - Leaderboard */}
        <div className="sidebar">
          <div className="leaderboard-header">
            <span className="trophy">🏆</span>
            <span className="dash">-</span>
          </div>
          <div className="leaderboard-list">
            {leaderboard.map((player, index) => (
              <div key={index} className="leaderboard-item">
                <span className="player-name">{player.name}</span>
                <span className="player-amount">
                  <span className="fun-icon">●</span>
                  {player.amount.toFixed(2)} FUN
                </span>
              </div>
            ))}
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
      </div>

      {/* Bottom Control Bar */}
      <div className="control-bar">
        <div className="balance">Balance {balance.toFixed(2)} FUN</div>
        <button className="auto-btn">AUTO</button>
        
        <div className="betting-section">
          <div className="bet-input">
            <div className="bet-amount">{betAmount.toFixed(2)} FUN</div>
            <div className="bet-separator">-</div>
            <div className="bet-multiplier">X</div>
          </div>
          <button className="place-bet-btn" onClick={placeBet}>
            PLACE BET (NEXT ROUND)
          </button>
        </div>

        <div className="betting-section">
          <div className="bet-input">
            <div className="bet-amount">{betAmount.toFixed(2)} FUN</div>
            <div className="bet-separator">-</div>
            <div className="bet-multiplier">X</div>
          </div>
          <button className="place-bet-btn" onClick={placeBet}>
            PLACE BET (NEXT ROUND)
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrashGame;
