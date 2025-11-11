import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import './Deposit.css';

const Deposit = ({ onClose, onDeposit }) => {
  const [tab, setTab] = useState('fiat'); // 'crypto' or 'fiat'
  const [paymentMethod] = useState('India'); // Used but setter not needed
  const [depositCurrency] = useState('INR'); // Used in JSX and handleDeposit, but setter not needed
  const [depositMethod] = useState('UPI Fast'); // Used in JSX and handleDeposit, but setter not needed
  const [amount, setAmount] = useState('500');
  const [selectedBonus, setSelectedBonus] = useState('no-bonus');

  const presetAmounts = ['500', '1,000', '5,000', '10,000', '50,000'];
  const minAmount = 500;
  const maxAmount = 50000;

  const handleAmountChange = (value) => {
    // Remove commas and non-digit characters
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue === '') {
      setAmount('');
      return;
    }
    
    const numValue = parseInt(numericValue);
    if (numValue >= minAmount && numValue <= maxAmount) {
      setAmount(numericValue);
    }
  };

  const selectPreset = (preset) => {
    const value = preset.replace(/[^0-9]/g, '');
    setAmount(value);
  };

  const handleDeposit = () => {
    const depositAmount = parseInt(amount);
    if (depositAmount >= minAmount && depositAmount <= maxAmount) {
      onDeposit({
        amount: depositAmount,
        currency: depositCurrency,
        method: depositMethod,
        bonus: selectedBonus
      });
    }
  };

  return (
    <div className="deposit-overlay">
      <div className="deposit-modal">
        {/* Header */}
        <div className="deposit-header">
          <h2>Deposit</h2>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Tabs */}
        <div className="deposit-tabs">
          <button 
            className={`tab ${tab === 'crypto' ? 'active' : ''}`}
            onClick={() => setTab('crypto')}
          >
            Crypto
          </button>
          <button 
            className={`tab ${tab === 'fiat' ? 'active' : ''}`}
            onClick={() => setTab('fiat')}
          >
            Fiat
          </button>
        </div>

        {/* Payment Methods */}
        <div className="deposit-section">
          <div className="input-row">
            <div className="input-group">
              <label>Payment Methods Region</label>
              <div className="dropdown">
                <span className="flag">🇮🇳</span>
                <span>{paymentMethod}</span>
                <span className="dropdown-icon">▼</span>
              </div>
            </div>

            <div className="input-group">
              <label>Deposit Currency</label>
              <div className="dropdown">
                <span>{depositCurrency}</span>
                <span className="dropdown-icon">▼</span>
              </div>
            </div>
          </div>

          {/* Deposit Method */}
          <div className="deposit-method-section">
            <label>Deposit Method</label>
            <button className="method-btn active">
              {depositMethod}
            </button>
          </div>

          {/* Deposit Amount */}
          <div className="deposit-amount-section">
            <label>Deposit Amount (Min: ₹{minAmount.toLocaleString()} Max: ₹{maxAmount.toLocaleString()})</label>
            <div className="amount-input-wrapper">
              <span className="currency-symbol">₹</span>
              <input 
                type="text" 
                value={amount} 
                onChange={(e) => handleAmountChange(e.target.value)}
                className="amount-input"
                placeholder="500"
              />
            </div>

            <div className="preset-amounts">
              {presetAmounts.map((preset) => (
                <button
                  key={preset}
                  className={`preset-btn ${amount === preset.replace(/[^0-9]/g, '') ? 'active' : ''}`}
                  onClick={() => selectPreset(preset)}
                >
                  ₹{preset}
                </button>
              ))}
            </div>
          </div>

          {/* Bonus Selection */}
          <div className="bonus-section">
            <label>Choose a Bonus</label>
            <div className="bonus-option">
              <FaTimes className="bonus-close-icon" />
              <div className="bonus-content">
                <span className="bonus-title">No Bonus Selected</span>
                <span className="bonus-subtitle">Deposit without any bonus</span>
              </div>
              <input 
                type="radio" 
                checked={selectedBonus === 'no-bonus'}
                onChange={() => setSelectedBonus('no-bonus')}
              />
            </div>
            <button type="button" className="see-all-bonuses" onClick={(e) => e.preventDefault()}>
              See All Bonuses
              <span>▼</span>
            </button>
          </div>

          {/* Deposit Button */}
          <button 
            className="deposit-submit-btn"
            onClick={handleDeposit}
            disabled={!amount || parseInt(amount) < minAmount || parseInt(amount) > maxAmount}
          >
            Deposit ₹{amount ? parseInt(amount).toLocaleString() : '0'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Deposit;

