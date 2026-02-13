# Admin OTP Approval System - Implementation Guide

## Overview
Naya system implement kiya gaya hai jisme:
1. **Admin users:** Email/password se seedha login (no OTP)
2. **Normal users:** Email/password → Admin approval → OTP → Login

## User Types

### Admin Login Flow:
1. Email/password enter karta hai
2. Credentials verify hote hain
3. Profile check hota hai (is_admin = true)
4. **Seedha Home screen par redirect** (no OTP required)

### Normal User Login Flow:
1. Email/password enter karta hai
2. Credentials verify hote hain
3. Profile check hota hai (is_admin = false)
4. Login request create hota hai
5. Admin ko notification milti hai
6. User "Waiting for admin approval" screen dekhta hai
7. Admin OTP set karke approve karta hai
8. User OTP enter karta hai
9. Login successful

## Files Created/Modified

### 1. Database Migration
**File:** `supabase/migrations/014_admin_otp_approval_system.sql`

Yeh migration create karta hai:
- `login_requests` table - pending login requests store karne ke liye
- RLS policies - security ke liye
- Auto-expire function - purane requests ko expire karne ke liye

**Apply karne ka tarika:**
```sql
-- Supabase Dashboard > SQL Editor mein paste karke run karein
```

### 2. Admin Screen
**File:** `src/screens/AdminLoginApprovalsScreen.tsx`

Features:
- Pending login requests ki list
- Real-time updates (auto-refresh jab naya request aaye)
- Admin OTP set kar sakta hai (6-digit)
- Approve/Reject buttons
- Request status display (pending/approved/rejected/expired)

### 3. Storage Functions
**File:** `src/data/Storage.ts` (appended)

Naye functions:
- `createLoginRequest()` - Login request create karta hai
- `checkLoginRequestStatus()` - Request ka status check karta hai
- `verifyAdminOtp()` - Admin dwara set kiya gaya OTP verify karta hai
- `getPendingLoginRequests()` - Admin screen ke liye pending requests fetch karta hai
- `notifyAdminsOfLoginRequest()` - Admins ko notification bhejta hai

### 4. Login Screen (Modified)
**File:** `src/screens/LoginScreen.tsx`

Changes:
- Email OTP system hataya
- Admin approval system add kiya
- Polling mechanism - har 3 seconds mein check karta hai ki admin ne approve kiya ya nahi
- Waiting state UI - jab admin approval pending ho
- OTP input - admin dwara set kiya gaya OTP enter karne ke liye

## Setup Steps

### Step 1: Apply Database Migration
1. Supabase Dashboard kholen
2. SQL Editor mein jayen
3. `supabase/migrations/014_admin_otp_approval_system.sql` ka content copy karein
4. Paste karke Run karein

### Step 2: Add Admin Screen to Navigation
`App.tsx` mein add karein:

```typescript
import AdminLoginApprovalsScreen from './src/screens/AdminLoginApprovalsScreen';

// Stack.Navigator ke andar:
<Stack.Screen 
  name="AdminLoginApprovals" 
  component={AdminLoginApprovalsScreen}
  options={{ title: 'Login Approvals' }}
/>
```

### Step 3: Add Menu Item for Admins
Admin users ke liye HomeScreen ya settings mein button add karein:

```typescript
{profile?.is_admin && (
  <TouchableOpacity
    onPress={() => navigation.navigate('AdminLoginApprovals')}
    style={styles.menuItem}
  >
    <Icon name="shield-checkmark-outline" size={24} />
    <Text>Login Approvals</Text>
  </TouchableOpacity>
)}
```

## How It Works

### Admin Login Flow:
1. Admin email/password enter karta hai
2. Credentials verify hote hain
3. System check karta hai: `is_admin = true`
4. **Direct Home screen par redirect** (no OTP, no approval needed)
5. Notification services initialize hoti hain
6. Login complete

### Normal User Login Flow:
1. User email/password enter karta hai
2. Credentials verify hote hain
3. System check karta hai: `is_admin = false`
4. Login request create hota hai database mein
5. User ko "Waiting for admin approval" message dikhta hai
6. Screen har 3 seconds mein check karta hai ki admin ne approve kiya ya nahi
7. Jab admin approve kare, user ko OTP input field milta hai
8. User admin dwara set kiya gaya OTP enter karta hai
9. OTP verify hone par user login ho jata hai

### Admin Approval Flow:
1. Admin ko notification milti hai (currently console log, push notification implement karna hai)
2. Admin "Login Approvals" screen kholta hai
3. Pending requests ki list dikhti hai
4. Admin "Set OTP" button dabata hai
5. 6-digit OTP enter karta hai
6. "Approve" button dabata hai
7. User ko OTP input field mil jata hai

## Security Features

1. **Request Expiry:** Login requests 10 minutes mein expire ho jati hain
2. **RLS Policies:** Users sirf apni requests dekh sakte hain, admins sab dekh sakte hain
3. **Status Tracking:** pending/approved/rejected/expired status track hoti hai
4. **One-time Use:** Ek baar verify hone ke baad request reuse nahi ho sakti

## Testing

### Test Admin Login:
1. Admin account se app kholen
2. Email/password enter karein
3. **Seedha Home screen par pahunch jana chahiye** (no OTP screen)
4. Koi approval wait nahi hona chahiye

### Test Normal User Login:
1. Normal user account se app kholen
2. Email/password enter karein
3. "Waiting for admin approval" message dekhen
4. Admin device se "Login Approvals" screen kholen
5. Pending request dekhen
6. OTP set karein (e.g., 123456)
7. Approve karein
8. User screen par OTP input field aa jana chahiye
9. OTP enter karein
10. Login successful hona chahiye

### Test Admin Approval:
1. Admin account se login karein
2. "Login Approvals" screen kholen
3. Pending request dekhen
4. OTP set karein (e.g., 123456)
5. Approve karein
6. User screen par OTP input field aa jana chahiye

## Pending Tasks

### 1. Push Notifications
Currently `notifyAdminsOfLoginRequest()` function sirf console log karta hai.
Implement karna hai:
- Firebase Cloud Messaging setup
- Admin devices ko notification bhejni hai
- Notification click par Admin screen khulni chahiye

### 2. Cleanup Job
Old expired requests ko delete karne ke liye cron job setup karni hai:
```sql
-- Run this periodically (e.g., daily)
SELECT cleanup_old_login_requests();
```

### 3. UI Improvements
- Loading states improve karni hain
- Error handling better karni hai
- Success animations add karni hain

## Troubleshooting

### Issue: Login request create nahi ho rahi
**Solution:** Check karein ki migration properly apply hui hai:
```sql
SELECT * FROM login_requests LIMIT 1;
```

### Issue: Admin ko requests nahi dikh rahi
**Solution:** Check karein ki user admin hai:
```sql
SELECT is_admin FROM user_profiles WHERE id = 'user_id';
```

### Issue: Polling kaam nahi kar rahi
**Solution:** Console logs check karein, network connectivity verify karein

## Code Examples

### Create Login Request:
```typescript
const requestId = await createLoginRequest(
  userId,
  'user@example.com',
  'John Doe'
);
```

### Check Request Status:
```typescript
const status = await checkLoginRequestStatus(requestId);
if (status?.status === 'approved' && status.otp) {
  // Show OTP input
}
```

### Verify OTP:
```typescript
const isValid = await verifyAdminOtp(requestId, '123456');
if (isValid) {
  // Login successful
}
```

## Benefits

1. **No Email Dependency:** Email service ki zarurat nahi
2. **Admin Control:** Admin decide karta hai kaun login kar sakta hai
3. **Secure:** OTP admin set karta hai, predictable nahi hai
4. **Real-time:** Instant approval/rejection
5. **Audit Trail:** Sab requests database mein logged hain

## Next Steps

1. Migration apply karein
2. Admin screen ko navigation mein add karein
3. Test karein user aur admin dono flows
4. Push notifications implement karein
5. Production mein deploy karein

---

**Note:** Yeh system production-ready hai lekin push notifications implement karne ki zarurat hai for better UX.
