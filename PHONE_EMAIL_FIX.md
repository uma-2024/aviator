# Phone/Email Registration Fix

## Problem
Users trying to register with phone number were getting error: "Please provide email and password"

## Root Cause
1. Frontend was sending `undefined` for unused fields
2. Backend validation wasn't properly handling phone-only registration
3. User model needed custom validation

## Solution Applied

### 1. Frontend Fix (`src/services/api.js`)
- Added data cleaning to remove `undefined` fields
- Phone registration now sends: `{ username, phone, password }`
- Email registration now sends: `{ username, email, password }`

### 2. Backend User Model (`backend/src/models/User.js`)
- Added custom validation to ensure either email OR phone is provided
- Both fields are optional individually, but at least one must be present

### 3. Backend Controller (`backend/src/controllers/authController.js`)
- Enhanced validation to check for actual string values (not just falsy)
- Phone registration creates user with only phone field
- Email registration creates user with only email field
- All endpoints now return both email and phone fields (can be null)

## How It Works Now

### Registration
- **Email Signup**: User provides username, email, password
- **Phone Signup**: User provides username, phone, password
- Backend accepts either and validates properly

### Login
- User can login with:
  - Email + password
  - Phone number + password
- Backend searches both fields

## Database Schema
```javascript
{
  username: String (required, unique),
  email: String (optional, unique, sparse),
  phone: String (optional, unique, sparse),
  password: String (required),
  balance: Number (default: 1000),
  // ... other fields
}
```

## Testing

To test the fix:

1. **Restart backend**:
```bash
cd backend
npm start
```

2. **Test Phone Registration**:
- Open the app
- Go to Sign Up
- Toggle to "Phone" tab
- Enter username, phone number, and password
- Should register successfully

3. **Test Email Registration**:
- Toggle to "Email" tab
- Enter username, email, and password
- Should register successfully

4. **Test Login with Phone**:
- Toggle to "Phone" tab
- Enter phone number and password
- Should login successfully

5. **Test Login with Email**:
- Toggle to "Email" tab
- Enter email and password
- Should login successfully

## Status
✅ Frontend updated to send proper data
✅ Backend validation updated
✅ User model updated with custom validation
✅ All endpoints return phone and email fields
✅ Ready for testing

