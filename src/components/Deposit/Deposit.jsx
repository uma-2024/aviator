import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { createRazorpayOrder, verifyRazorpayPayment } from '../../services/api';
import './Deposit.css';

const Deposit = ({ onClose, onDeposit, user }) => {
  const [tab, setTab] = useState('fiat'); // 'crypto' or 'fiat'
  const [paymentMethod] = useState('India'); // Used but setter not needed
  const [depositCurrency] = useState('INR'); // Used in JSX and handleDeposit, but setter not needed
  const [depositMethod] = useState('UPI Fast'); // Used in JSX and handleDeposit, but setter not needed
  const [amount, setAmount] = useState('500');
  const [selectedBonus, setSelectedBonus] = useState('no-bonus');
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState(null);

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

  // Load Razorpay script and key
  useEffect(() => {
    const loadRazorpay = () => {
      // Check if Razorpay is already loaded
      if (window.Razorpay) {
        const key = process.env.REACT_APP_RAZORPAY_KEY_ID || 
                    process.env.VITE_RAZORPAY_KEY_ID || 
                    'rzp_test_1DP5mmOlF5G5ag'; // Replace with your actual Razorpay key
        setRazorpayKey(key);
        return;
      }

      // If not loaded, load it dynamically
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        const key = process.env.REACT_APP_RAZORPAY_KEY_ID || 
                    process.env.VITE_RAZORPAY_KEY_ID || 
                    'rzp_test_1DP5mmOlF5G5ag';
        setRazorpayKey(key);
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
        alert('Failed to load payment gateway. Please refresh the page.');
      };
      document.body.appendChild(script);

      return () => {
        // Cleanup: remove script if component unmounts
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    };

    loadRazorpay();
  }, []);

  const handleDeposit = async () => {
    const depositAmount = parseInt(amount);
    if (depositAmount < minAmount || depositAmount > maxAmount) {
      alert(`Amount must be between ₹${minAmount.toLocaleString()} and ₹${maxAmount.toLocaleString()}`);
      return;
    }

    if (!user || !user._id) {
      alert('Please login to make a deposit');
      return;
    }

    if (!razorpayKey) {
      alert('Payment gateway not configured. Please contact support.');
      return;
    }

    // Check if Razorpay is loaded
    if (!window.Razorpay) {
      alert('Payment gateway is loading. Please wait a moment and try again.');
      return;
    }

    setIsProcessing(true);

    try {
      // Create Razorpay order on backend
      console.log('Creating Razorpay order for amount:', depositAmount, 'userId:', user._id || user.id);
      const orderResponse = await createRazorpayOrder(depositAmount, user._id || user.id);
      console.log('Order response:', orderResponse);
      
      if (!orderResponse.success || !orderResponse.data) {
        const errorMsg = orderResponse.error || 'Failed to create payment order';
        console.error('Order creation failed:', errorMsg);
        throw new Error(errorMsg);
      }

      const { orderId, amount: orderAmount } = orderResponse.data;
      console.log('Order created successfully:', { orderId, orderAmount });

      // Initialize Razorpay checkout
      const options = {
        key: razorpayKey,
        amount: orderAmount, // Amount in paise
        currency: 'INR',
        name: 'Aviator Game',
        description: `Deposit of ₹${depositAmount.toLocaleString()}`,
        order_id: orderId,
        handler: async function (response) {
          try {
            // Verify payment on backend
            const verifyResponse = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: depositAmount,
              userId: user._id || user.id,
            });

            if (verifyResponse.success) {
              // Payment successful
              onDeposit({
                amount: depositAmount,
                currency: depositCurrency,
                method: depositMethod,
                bonus: selectedBonus,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
              });
              alert('Payment successful! Your balance has been updated.');
              onClose();
            } else {
              throw new Error(verifyResponse.error || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert(`Payment verification failed: ${error.message}`);
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: user.username || user.name || '',
          email: user.email || '',
          contact: user.phone || '',
        },
        theme: {
          color: '#ff6b35',
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
          },
        },
      };

      try {
        const razorpay = new window.Razorpay(options);
        razorpay.on('payment.failed', function (response) {
          console.error('Payment failed:', response.error);
          alert(`Payment failed: ${response.error.description || 'Unknown error'}`);
          setIsProcessing(false);
        });

        razorpay.open();
      } catch (razorpayError) {
        console.error('Razorpay initialization error:', razorpayError);
        alert(`Failed to initialize payment gateway: ${razorpayError.message}`);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Deposit error:', error);
      alert(`Deposit failed: ${error.message}`);
      setIsProcessing(false);
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
            disabled={!amount || parseInt(amount) < minAmount || parseInt(amount) > maxAmount || isProcessing}
          >
            {isProcessing ? 'Processing...' : `Deposit ₹${amount ? parseInt(amount).toLocaleString() : '0'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Deposit;

