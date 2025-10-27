import React, { useState } from 'react';
import Login from '../Login/Login.jsx';
import Signup from '../Signup/Signup.jsx';

const AuthModal = ({ initialMode = 'login', onClose, onLogin, onSignup }) => {
  const [authMode, setAuthMode] = useState(initialMode); // 'login' or 'signup'

  // Update auth mode when initial mode changes
  React.useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode]);

  const handleLogin = (userData) => {
    const token = userData.token;
    const userWithoutToken = { ...userData };
    delete userWithoutToken.token;
    onLogin(userWithoutToken, token);
  };

  const handleSignup = (userData) => {
    const token = userData.token;
    const userWithoutToken = { ...userData };
    delete userWithoutToken.token;
    onSignup(userWithoutToken, token);
  };

  const switchToSignup = () => {
    setAuthMode('signup');
  };

  const switchToLogin = () => {
    setAuthMode('login');
  };

  const styles = {
    authModalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.3s ease-out'
    },
    authModalContainer: {
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      borderRadius: '16px',
      width: '100%',
      maxWidth: '450px',
      margin: '20px',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6)',
      border: '1px solid #333',
      position: 'relative',
      overflow: 'hidden',
      animation: 'slideUp 0.4s ease-out'
    },
    authModalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px 30px',
      borderBottom: '1px solid #333',
      background: 'rgba(0, 0, 0, 0.2)'
    },
    authTabs: {
      display: 'flex',
      background: '#2a2a2a',
      borderRadius: '8px',
      padding: '4px',
      gap: '4px'
    },
    authTab: {
      padding: '10px 20px',
      background: 'none',
      border: 'none',
      color: '#888',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      borderRadius: '6px',
      transition: 'all 0.3s ease',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    authTabActive: {
      padding: '10px 20px',
      background: 'linear-gradient(135deg, #ff6b35, #ff8c42)',
      border: 'none',
      color: '#fff',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      borderRadius: '6px',
      transition: 'all 0.3s ease',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)'
    },
    modalCloseBtn: {
      background: 'none',
      border: 'none',
      color: '#888',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '50%',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    authModalContent: {
      position: 'relative'
    }
  };

  return (
    <div style={styles.authModalOverlay}>
      <div style={styles.authModalContainer}>
        <div style={styles.authModalHeader}>
          <div style={styles.authTabs}>
            <button 
              style={authMode === 'login' ? styles.authTabActive : styles.authTab}
              onClick={switchToLogin}
            >
              Sign In
            </button>
            <button 
              style={authMode === 'signup' ? styles.authTabActive : styles.authTab}
              onClick={switchToSignup}
            >
              Sign Up
            </button>
          </div>
          <button style={styles.modalCloseBtn} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div style={styles.authModalContent}>
          {authMode === 'login' ? (
            <Login 
              onLogin={handleLogin}
              onSwitchToSignup={switchToSignup}
              onClose={onClose}
            />
          ) : (
            <Signup 
              onSignup={handleSignup}
              onSwitchToLogin={switchToLogin}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
