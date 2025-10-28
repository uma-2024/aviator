import React, { useState } from 'react';
import { loginUser, googleAuth } from '../../services/api';
import { MdPhoneIphone, MdOutlineEmail } from 'react-icons/md';
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa';
import './Login.css';

const Login = ({ onLogin, onSwitchToSignup, onClose }) => {
  const [loginType, setLoginType] = useState('email'); // 'email' or 'phone'
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (loginType === 'email') {
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
      }
    } else {
      if (!formData.phone) {
        newErrors.phone = 'Phone number is required';
      } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
        newErrors.phone = 'Phone number is invalid';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      // Send identifier (email or phone) for login
      const response = await loginUser({
        identifier: loginType === 'email' ? formData.email : formData.phone,
        password: formData.password
      });
      
      if (response.token) {
        localStorage.setItem('authToken', response.token);
      }
      
      onLogin({
        ...response.user,
        token: response.token
      });
    } catch (error) {
      setErrors({ general: error.message || 'Login failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    
    try {
      // For now, show instruction to user
      // In production, implement proper Google OAuth
      setErrors({ general: 'Google Sign-In coming soon! For now, please use email/phone to sign in.' });
    } catch (error) {
      setErrors({ general: 'Google sign-in failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="menace-auth-container">
      <div className="menace-auth-modal">
        {/* Header */}
        <div className="menace-auth-header">
          <h2>Welcome to SPACE X1</h2>
          <button className="menace-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="menace-auth-form">
          {/* Error Message */}
          {errors.general && (
            <div className="menace-error-box">
              {errors.general}
            </div>
          )}

          {/* Email/Phone Toggle */}
          <div className="menace-toggle-tabs">
            <button
              type="button"
              className={`menace-tab ${loginType === 'email' ? 'active' : ''}`}
              onClick={() => setLoginType('email')}
              disabled={isLoading}
            >
              <span className="menace-tab-icon"><MdOutlineEmail /></span>
              <span>Email</span>
            </button>
            <button
              type="button"
              className={`menace-tab ${loginType === 'phone' ? 'active' : ''}`}
              onClick={() => setLoginType('phone')}
              disabled={isLoading}
            >
              <span className="menace-tab-icon"><MdPhoneIphone /></span>
              <span>Phone</span>
            </button>
          </div>

          {/* Email/Phone Input */}
          <div className="menace-form-group">
            <label htmlFor={loginType === 'email' ? 'email' : 'phone'}>
              {loginType === 'email' ? 'Email address' : 'Mobile phone'} *
            </label>
            <div className="menace-input-wrapper">
              {loginType === 'email' ? (
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
                  className={errors.email ? 'menace-input-error' : 'menace-input'}
              placeholder="Enter your email"
              disabled={isLoading}
            />
              ) : (
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={errors.phone ? 'menace-input-error' : 'menace-input'}
                  placeholder="Enter your phone number"
                  disabled={isLoading}
                />
              )}
            </div>
            {loginType === 'email' && errors.email && <span className="menace-error-text">{errors.email}</span>}
            {loginType === 'phone' && errors.phone && <span className="menace-error-text">{errors.phone}</span>}
          </div>

          {/* Password Input */}
          <div className="menace-form-group">
            <label htmlFor="password">Password *</label>
            <div className="menace-input-wrapper">
            <input
                type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
                className={errors.password ? 'menace-input-error' : 'menace-input'}
              placeholder="Enter your password"
              disabled={isLoading}
            />
              <span 
                className="menace-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
              </span>
          </div>
            {errors.password && <span className="menace-error-text">{errors.password}</span>}
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="menace-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>

          {/* Social Login */}
          <div className="menace-social-section">
            <span className="menace-or-text">Or sign in with</span>
            <div className="menace-social-buttons">
              <button type="button" className="menace-social-btn google" onClick={handleGoogleSignIn} disabled={isLoading}>
                <span className="menace-social-icon">G</span>
              </button>
              <button type="button" className="menace-social-btn telegram" disabled={isLoading}>
                <span className="menace-social-icon">📱</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="menace-auth-footer">
            <span className="menace-footer-text">
              New to the game? <button type="button" onClick={onSwitchToSignup} className="menace-link">Sign up</button>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
