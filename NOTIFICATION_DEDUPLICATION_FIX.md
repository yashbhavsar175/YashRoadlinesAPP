# Notification Deduplication Fix

## Problem
Notifications were appearing twice when the admin app was open because:
1. Database insert triggered AdminNotificationListener (realtime subscription)
2. FCM push notification also arrived at the same time
3. Both notifications were processed simultaneously before deduplication could catch them

When app was closed, only FCM worked (which is correct behavior).

## Solution
Implemented two-layer deduplication strategy:

### Layer 1: Content-Based Deduplication
**AdminNotificationListener.ts** - Enhanced deduplication logic:
- Changed from ID+timestamp to content-based tracking
- Creates unique key from: `title + first 50 chars of message`
- Removed timestamp from key (both notifications arrive at same millisecond)
- Adds key to Set IMMEDIATELY to prevent race conditions
- Auto-cleanup after 5 minutes (prevents memory leak)
- Exposed public method `showNotificationWithDedup()` for FCM messages

### Layer 2: Timing Delay
**DeviceNotificationService.ts** - Added 500ms delay:
- Database insert happens first (instant)
- Wait 500ms before sending FCM push
- Gives AdminNotificationListener time to process and mark as shown
- FCM arrives later and gets caught by deduplication

### Layer 3: FCM Integration
**PushNotificationService.ts** - Routes through deduplication:
- FCM foreground messages use AdminNotificationListener
- All notifications go through same deduplication logic
- Consistent notification display

## How It Works

### When App is OPEN:
1. User action → DeviceNotificationService sends DB insert
2. DB insert arrives → AdminNotificationListener shows notification, adds key to Set
3. 500ms delay
4. FCM push arrives → AdminNotificationListener checks Set, finds duplicate, skips
5. Result: User sees only ONE notification ✅

### When App is CLOSED/BACKGROUND:
1. User action → DeviceNotificationService sends DB insert + FCM push
2. DB insert happens but AdminNotificationListener is not active
3. FCM push arrives → Android system shows notification
4. Result: User sees ONE notification ✅

## Testing
Test both scenarios:
1. Admin app OPEN - perform user action, verify only 1 notification appears
2. Admin app CLOSED - perform user action, verify notification appears
3. Admin app BACKGROUND - perform user action, verify notification appears
4. Multiple rapid actions - verify no duplicates

## Files Modified
- `src/services/AdminNotificationListener.ts` - Content-based deduplication
- `src/services/DeviceNotificationService.ts` - Added 500ms delay before FCM
- `src/services/PushNotificationService.ts` - Route FCM through deduplication
