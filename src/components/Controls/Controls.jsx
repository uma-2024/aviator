import React from 'react';
import './Controls.css';

const Controls = ({ isRunning, onStartGame, onStopGame }) => {
  return (
    <div className="controls">
      <button 
        className={`start-button ${isRunning ? 'running' : ''}`}
        onClick={isRunning ? onStopGame : onStartGame}
      >
        {isRunning ? 'CASH OUT' : 'START GAME'}
      </button>
    </div>
  );
};

export default Controls;
