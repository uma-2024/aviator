import React from 'react';
import './Graph.css';

const Graph = ({ rocketPosition, trail, multiplier, bets }) => {
  return (
    <div className="graph-container">
      <svg className="graph" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#333" strokeWidth="0.1" opacity="0.3"/>
          </pattern>
          <radialGradient id="trailGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffaa00" />
            <stop offset="100%" stopColor="#ff6600" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        
        {/* Y-axis labels */}
        <text x="2" y="95" className="axis-label">1.00x</text>
        <text x="2" y="75" className="axis-label">1.3x</text>
        <text x="2" y="55" className="axis-label">1.6x</text>
        <text x="2" y="35" className="axis-label">1.9x</text>
        <text x="2" y="15" className="axis-label">2.2x</text>
        
        {/* X-axis labels */}
        <text x="10" y="98" className="axis-label">0s</text>
        <text x="30" y="98" className="axis-label">1s</text>
        <text x="50" y="98" className="axis-label">2s</text>
        <text x="70" y="98" className="axis-label">3s</text>
        <text x="90" y="98" className="axis-label">4s</text>
        
        {/* Rocket trail */}
        {trail.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={100 - point.y}
            r={2 - (trail.length - index) * 0.1}
            fill="url(#trailGradient)"
            opacity={0.8 - (trail.length - index) * 0.04}
          />
        ))}
        
        {/* Rocket */}
        <g transform={`translate(${rocketPosition.x}, ${100 - rocketPosition.y})`}>
          <polygon
            points="0,-8 4,0 0,8 -4,0"
            fill="white"
            stroke="#fff"
            strokeWidth="0.5"
            className="rocket"
          />
          <circle cx="0" cy="0" r="3" fill="white" opacity="0.3" className="rocket-glow" />
        </g>
      </svg>
      
      {/* Current Multiplier Display */}
      <div className="multiplier-display">
        <div className="multiplier-value">{multiplier.toFixed(2)}x</div>
        <div className="multiplier-separator"></div>
        <div className="bets-count">BETS {bets}</div>
      </div>
    </div>
  );
};

export default Graph;
