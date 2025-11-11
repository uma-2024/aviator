import React, { useState } from 'react';
import { registerUser } from '../../services/api';
import { MdPhoneIphone, MdOutlineEmail } from 'react-icons/md';
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa';
import './Signup.css';

const Signup = ({ onSignup, onSwitchToLogin, onClose }) => {
  const [signupType, setSignupType] = useState('email'); // 'email' or 'phone'
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (signupType === 'email') {
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

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const response = await registerUser({
        username: formData.username,
        email: signupType === 'email' ? formData.email : undefined,
        phone: signupType === 'phone' ? formData.phone : undefined,
        password: formData.password
      });
      
      if (response.token) {
        localStorage.setItem('authToken', response.token);
      }
      
      onSignup({
        ...response.user,
        token: response.token
      });
    } catch (error) {
      setErrors({ general: error.message || 'Signup failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    
    try {
      // For now, show instruction to user
      // In production, implement proper Google OAuth
      setErrors({ general: 'Google Sign-Up coming soon! For now, please use email/phone to sign up.' });
    } catch (error) {
      setErrors({ general: 'Google sign-up failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="menace-auth-container">
      <div className="menace-auth-modal">
        {/* Header */}
        <div className="menace-auth-header">
          <h2>Join SPACE X1</h2>
          <button className="menace-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="menace-auth-form">
          {/* Error Message */}
          {errors.general && (
            <div className="menace-error-box">
              {errors.general}
            </div>
          )}

          {/* Username Input */}
          <div className="menace-form-group">
            <label htmlFor="username">Username *</label>
            <div className="menace-input-wrapper">
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
                className={errors.username ? 'menace-input-error' : 'menace-input'}
              placeholder="Choose a username"
              disabled={isLoading}
            />
            </div>
            {errors.username && <span className="menace-error-text">{errors.username}</span>}
          </div>

          {/* Email/Phone Toggle */}
          <div className="menace-toggle-tabs">
            <button
              type="button"
              className={`menace-tab ${signupType === 'email' ? 'active' : ''}`}
              onClick={() => setSignupType('email')}
              disabled={isLoading}
            >
              <span className="menace-tab-icon"><MdOutlineEmail /></span>
              <span>Email</span>
            </button>
            <button
              type="button"
              className={`menace-tab ${signupType === 'phone' ? 'active' : ''}`}
              onClick={() => setSignupType('phone')}
              disabled={isLoading}
            >
              <span className="menace-tab-icon"><MdPhoneIphone /></span>
              <span>Phone</span>
            </button>
          </div>

          {/* Email/Phone Input */}
          <div className="menace-form-group">
            <label htmlFor={signupType === 'email' ? 'email' : 'phone'}>
              {signupType === 'email' ? 'Email address' : 'Mobile phone'} *
            </label>
            <div className="menace-input-wrapper">
              {signupType === 'email' ? (
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
            {signupType === 'email' && errors.email && <span className="menace-error-text">{errors.email}</span>}
            {signupType === 'phone' && errors.phone && <span className="menace-error-text">{errors.phone}</span>}
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

          {/* Confirm Password Input */}
          <div className="menace-form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <div className="menace-input-wrapper">
            <input
                type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
                className={errors.confirmPassword ? 'menace-input-error' : 'menace-input'}
              placeholder="Confirm your password"
              disabled={isLoading}
            />
              <span 
                className="menace-password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaRegEyeSlash /> : <FaRegEye />}
              </span>
          </div>
            {errors.confirmPassword && <span className="menace-error-text">{errors.confirmPassword}</span>}
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="menace-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Sign up'}
          </button>

          {/* Social Login */}
          <div className="menace-social-section">
            <span className="menace-or-text">Or sign up with</span>
            <div className="menace-social-buttons">
              <button type="button" className="menace-social-btn google" onClick={handleGoogleSignUp} disabled={isLoading}>
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
              Already in the game? <button type="button" onClick={onSwitchToLogin} className="menace-link">Sign in</button>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
