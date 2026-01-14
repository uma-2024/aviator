# Razorpay Integration Guide

## Frontend Integration Complete ✅

The frontend has been integrated with Razorpay. Here's what has been implemented:

### Changes Made:

1. **Added Razorpay Script** (`public/index.html`)
   - Added Razorpay checkout script to the HTML head

2. **Added API Functions** (`src/services/api.js`)
   - `createRazorpayOrder(amount, userId)` - Creates a Razorpay order on the backend
   - `verifyRazorpayPayment(paymentData)` - Verifies payment signature on the backend

3. **Updated Deposit Component** (`src/components/Deposit/Deposit.jsx`)
   - Integrated Razorpay checkout flow
   - Added payment processing state
   - Handles payment success/failure
   - Shows processing indicator during payment

4. **Updated CrashGame Component** (`src/components/CrashGame.jsx`)
   - Passes `user` prop to Deposit component

## Backend Requirements

You need to implement the following endpoints on your backend:

### 1. Create Razorpay Order Endpoint

**Endpoint:** `POST /api/payments/create-order`

**Request Body:**
```json
{
  "amount": 50000,  // Amount in paise (50000 = ₹500)
  "userId": "user_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_xxxxx",
    "amount": 50000
  }
}
```

**Implementation Notes:**
- Use Razorpay Node.js SDK to create an order
- Store the order in your database with userId and amount
- Return the order ID and amount to the frontend

### 2. Verify Payment Endpoint

**Endpoint:** `POST /api/payments/verify`

**Request Body:**
```json
{
  "razorpay_order_id": "order_xxxxx",
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_signature": "signature_here",
  "amount": 500,
  "userId": "user_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_xxxxx",
    "orderId": "order_xxxxx",
    "amount": 500,
    "userId": "user_id_here"
  }
}
```

**Implementation Notes:**
- Verify the payment signature using Razorpay's signature verification
- If verification succeeds:
  - Update user balance in database
  - Mark the order as completed
  - Create a transaction record
- If verification fails, return error

## Environment Variables

Add these to your `.env` file:

```env
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

For frontend, add to `.env`:
```env
REACT_APP_RAZORPAY_KEY_ID=your_razorpay_key_id
# OR
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

## Backend Implementation Example (Node.js/Express)

```javascript
const razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Order
app.post('/api/payments/create-order', async (req, res) => {
  try {
    const { amount, userId } = req.body;
    
    const options = {
      amount: amount, // Amount in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };
    
    const order = await razorpayInstance.orders.create(options);
    
    // Save order to database
    // await Order.create({ orderId: order.id, userId, amount, status: 'created' });
    
    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Verify Payment
app.post('/api/payments/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, userId } = req.body;
    
    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');
    
    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature',
      });
    }
    
    // Payment verified - update user balance
    const amountInRupees = amount / 100; // Convert from paise to rupees
    // await User.findByIdAndUpdate(userId, { $inc: { balance: amountInRupees } });
    // await Order.findOneAndUpdate({ orderId: razorpay_order_id }, { status: 'completed' });
    // await Transaction.create({ userId, amount: amountInRupees, type: 'deposit', paymentId: razorpay_payment_id });
    
    res.json({
      success: true,
      data: {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: amount,
        userId,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
```

## Testing

1. Use Razorpay test credentials for development
2. Test payment flow with test cards:
   - Success: 4111 1111 1111 1111
   - Failure: 4000 0000 0000 0002
3. Check payment verification in Razorpay dashboard

## Security Notes

- Never expose Razorpay Key Secret on the frontend
- Always verify payment signature on the backend
- Store transaction records for audit
- Handle payment failures gracefully
- Implement proper error handling and logging

