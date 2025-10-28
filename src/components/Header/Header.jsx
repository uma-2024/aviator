import React from 'react';
import './Header.css';

const Header = ({ gameHistory, onRefresh }) => {
  return (
    <div className="header-bar">
      <div className="live-indicator">
        <div className="live-dot"></div>
      </div>
      <div className="game-history">
        {gameHistory.map((result, index) => (
          <span 
            key={index} 
            className={`history-item ${result > 5 ? 'highlight' : ''}`}
          >
            {result.toFixed(2)}x
          </span>
        ))}
      </div>
      {/* <div className="refresh-icon" onClick={onRefresh}>↻</div> */}
    </div>
  );
};

export default Header;
