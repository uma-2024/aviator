import React, { useState } from 'react';
import './GameDetails.css';

const GameDetails = ({ onDemoPlay, onTrailer }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  return (
    <div className="game-details-container">
      {/* Left Section */}
      <div className="game-details-left">
        <h1 className="game-title">
          <span className="title-space">Pro</span>
          <span className="title-xy">Aviator</span>
        </h1>
        
        <p className="game-description">
          It's time to soar to new heights with BGaming! Launching the rocket to the stars means getting incredible winnings! Space XY is an exciting game with easy gameplay. Don't hesitate to join a breathtaking ride to the stars and make a fortune.
        </p>

        <div className="game-actions">
          <button className="demo-play-button" onClick={onDemoPlay}>
            DEMO PLAY
            <span className="play-icon">▶</span>
          </button>
          <button className="trailer-button" onClick={onTrailer}>
            TRAILER
          </button>
          <button 
            className={`favorite-button ${isFavorite ? 'active' : ''}`}
            onClick={handleFavorite}
            aria-label="Add to favorites"
          >
            <svg 
              viewBox="0 0 24 24" 
              fill={isFavorite ? "currentColor" : "none"} 
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Right Section - Game Stats Panel */}
      <div className="game-details-right">
        <div className="game-stats-panel">
          <div className="stat-row">
            <span className="stat-label">Game Type</span>
            <span className="stat-value">Casual</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">RTP</span>
            <span className="stat-value">97 %</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Max.multiplier</span>
            <span className="stat-value">x10000</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">ID</span>
            <span className="stat-value">SpaceXY</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Max Win</span>
            <span className="stat-value">€250 000</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Release Date</span>
            <span className="stat-value">Jan 13, 2022</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameDetails;
