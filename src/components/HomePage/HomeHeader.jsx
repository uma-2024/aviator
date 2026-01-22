import React from 'react';
import { FaTrophy, FaLock, FaSearch } from 'react-icons/fa';  // Import React Icons
import './HomeHeader.css';

const HomeHeader = () => {
  return (
    <header className="home-header">
      {/* Top Right Badges */}
      <div className="header-top-right">
        <div className="badge maxwin-club">
          <span className="badge-icon">⭐</span>
          <span className="badge-text">MAXWIN CLUB</span>
        </div>
        <div className="badge bgaming">
          <span className="badge-icon">B</span>
          <span className="badge-text">BGAMING</span>
        </div>
      </div>

      {/* Main Header Content */}
      <div className="header-main">
        {/* Left: Logo */}
        <div className="header-logo">
          <span className="logo-text">PLAYERS HUB</span>
        </div>

        {/* Center: Navigation */}
        <nav className="header-nav">
          <a href="#" className="nav-item">
            <span className="nav-icon"><FaLock /></span> {/* React Icon */}
            <span className="nav-text">FORTUNE WHEEL</span>
          </a>
          <a href="#" className="nav-item">
            <span className="nav-icon"><FaTrophy /></span> {/* React Icon */}
            <span className="nav-text">LEADERBOARD</span>
          </a>
          <a href="#" className="nav-item">
            <span className="nav-text">LIVE RTP</span>
          </a>
          <a href="#" className="nav-item">
            <span className="nav-text">TOP WINS</span>
          </a>
          <a href="#" className="nav-item">
            <span className="nav-text">FAQ</span>
          </a>
          <a href="#" className="nav-item">
            <span className="nav-text">GAMES</span>
          </a>
          <a href="#" className="nav-item search">
            <span className="nav-icon"><FaSearch /></span> {/* React Icon */}
          </a>
        </nav>

        {/* Right: Login Button */}
        <div className="header-actions">
          <button className="login-button">LOGIN</button>
        </div>
      </div>
    </header>
  );
};

export default HomeHeader;
