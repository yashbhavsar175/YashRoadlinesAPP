# 🚀 Quick Reference Card

## 📦 Import Cheat Sheet

### Components
```typescript
import { 
  CommonHeader,      // Standardized header
  CommonInput,       // Input with label & validation
  LoadingSpinner,    // Loading indicator
  EmptyState,        // Empty state UI
  Dropdown,          // Dropdown selector
  CustomAlert,       // Custom alert
  NotificationBell,  // Notification icon
} from '../components';
```

### Services
```typescript
import { 
  NotificationService,          // Database notifications
  UnifiedNotificationManager,   // All-in-one notifications
  BiometricAuthService,         // Biometric auth
  UserAccessHelper,             // User permissions
  AuthLogoutService,            // Logout handling
} from '../services';
```

### Data Modules
```typescript
import { 
  SyncManager,              // Offline sync
  OFFLINE_KEYS,             // Cache keys
  clearPaymentCache,        // Clear cache
  isOnline,                 // Network check
  getSyncStatus,            // Sync status
  formatDateDisplay,        // Date formatting
} from '../data/modules';
```

---

## 🎨 Component Usage

### CommonHeader
```typescript
<CommonHeader 
  title="Screen Title" 
  onBackPress={() => navigation.goBack()}
  rightComponent={<Icon name="settings" />} // Optional
/>
```

### CommonInput
```typescript
<CommonInput
  label="Field Name"
  required              // Shows * mark
  value={value}
  onChangeText={setValue}
  placeholder="Enter value"
  error={errorMessage}  // Optional error
  keyboardType="numeric" // Optional
/>
```

### LoadingSpinner
```typescript
<LoadingSpinner 
  message="Loading data..." 
  size="large"           // or "small"
  color="#007AFF"        // Optional
/>
```

### EmptyState
```typescript
<EmptyState
  icon="document-outline"
  title="No Data"
  message="Add your first entry to get started"
  iconSize={60}          // Optional
/>
```

---

## 🔔 Notification Usage

### Send to Admin
```typescript
import { UnifiedNotificationManager } from '../services';

await UnifiedNotificationManager.sendToAdmin({
  title: 'New Entry Added',
  message: 'User added a new payment entry',
  type: 'add',           // 'add' | 'edit' | 'delete' | 'system'
  severity: 'success',   // 'info' | 'warning' | 'success' | 'error'
  data: { amount: 5000 } // Optional metadata
});
```

### Show Local Notification
```typescript
UnifiedNotificationManager.showLocalNotification({
  title: 'Success',
  message: 'Entry saved successfully',
  type: 'system',
  severity: 'success'
});
```

---

## 💾 Data Operations

### Check Online Status
```typescript
import { isOnline } from '../data/modules';

const online = await isOnline();
if (online) {
  // Sync with server
} else {
  // Save offline
}
```

### Sync Manager
```typescript
import { SyncManager } from '../data/modules';

// Add pending operation
await SyncManager.getInstance().addPendingOperation({
  table: 'agencies',
  action: 'INSERT',
  data: { name: 'New Agency' }
});

// Sync all pending
await SyncManager.getInstance().syncPendingOperations();

// Get pending count
const count = await SyncManager.getInstance().getPendingCount();
```

### Cache Management
```typescript
import { clearPaymentCache, clearAllCache } from '../data/modules';

// Clear specific cache
await clearPaymentCache();

// Clear all cache
await clearAllCache();
```

---

## 📅 Date Utilities

```typescript
import { 
  formatDateDisplay,      // "23 October, 2025"
  formatDateTimeDisplay,  // "23 Oct, 2025, 10:30 AM"
  isSameDate,            // Compare dates
  formatDateForComparison // "2025-10-23"
} from '../data/modules';

const displayDate = formatDateDisplay(new Date());
const displayDateTime = formatDateTimeDisplay(new Date());
const same = isSameDate(date1, date2);
```

---

## 🎯 Common Patterns

### Standard Screen Structure
```typescript
import React, { useState, useCallback } from 'react';
import { View, ScrollView, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CommonHeader, LoadingSpinner, EmptyState } from '../components';
import { GlobalStyles } from '../theme/styles';
import { Colors } from '../theme/colors';

function MyScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load data
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return (
    <View style={GlobalStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      <CommonHeader 
        title="My Screen" 
        onBackPress={() => navigation.goBack()} 
      />

      <ScrollView>
        {loading ? (
          <LoadingSpinner message="Loading..." />
        ) : data.length === 0 ? (
          <EmptyState
            icon="document-outline"
            title="No Data"
            message="Add your first entry"
          />
        ) : (
          // Render data
        )}
      </ScrollView>
    </View>
  );
}

export default MyScreen;
```

### Form with Validation
```typescript
import { CommonInput } from '../components';

const [name, setName] = useState('');
const [amount, setAmount] = useState('');
const [errors, setErrors] = useState({});

const validate = () => {
  const newErrors = {};
  if (!name.trim()) newErrors.name = 'Name is required';
  if (!amount || parseFloat(amount) <= 0) {
    newErrors.amount = 'Valid amount required';
  }
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

return (
  <>
    <CommonInput
      label="Name"
      required
      value={name}
      onChangeText={setName}
      error={errors.name}
    />
    
    <CommonInput
      label="Amount"
      required
      value={amount}
      onChangeText={setAmount}
      keyboardType="numeric"
      error={errors.amount}
    />
  </>
);
```

---

## 🔍 Debugging Tips

### Check Sync Status
```typescript
import { getSyncStatus } from '../data/modules';

const status = await getSyncStatus();
console.log('Sync Status:', {
  lastSync: status.lastSync,
  pending: status.pendingOperations,
  online: status.isOnline
});
```

### Test Notifications
```typescript
import { UnifiedNotificationManager } from '../services';

// Test local notification
UnifiedNotificationManager.showLocalNotification({
  title: 'Test',
  message: 'This is a test notification',
  type: 'system'
});
```

---

## 📱 Platform-Specific

### Android
```typescript
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  // Android-specific code
}
```

### iOS
```typescript
if (Platform.OS === 'ios') {
  // iOS-specific code
}
```

---

## 🎨 Styling

### Use Global Styles
```typescript
import { GlobalStyles } from '../theme/styles';
import { Colors } from '../theme/colors';

<View style={GlobalStyles.container}>
  <View style={GlobalStyles.card}>
    <Text style={GlobalStyles.title}>Title</Text>
    <Text style={GlobalStyles.bodyText}>Body</Text>
  </View>
</View>
```

### Common Colors
```typescript
Colors.primary        // Main brand color
Colors.surface        // Card background
Colors.background     // Screen background
Colors.textPrimary    // Main text
Colors.textSecondary  // Secondary text
Colors.error          // Error messages
Colors.success        // Success messages
```

---

## ⚡ Performance Tips

1. **Use useFocusEffect** for data loading
2. **Use useCallback** for functions
3. **Use React.memo** for expensive components
4. **Avoid inline styles** - use StyleSheet.create
5. **Use FlatList** for long lists (not ScrollView)

---

## 🆘 Common Issues

### Issue: Component not found
```typescript
// ❌ Wrong
import CommonHeader from '../components/CommonHeader';

// ✅ Correct
import { CommonHeader } from '../components';
```

### Issue: Notification not showing
```typescript
// Make sure to initialize
import { UnifiedNotificationManager } from '../services';

// In App.tsx or main component
await UnifiedNotificationManager.initialize();
```

### Issue: Data not syncing
```typescript
// Check online status first
import { isOnline } from '../data/modules';

const online = await isOnline();
if (!online) {
  console.log('Offline - data will sync later');
}
```

---

## 📚 More Resources

- **OPTIMIZATION_GUIDE.md** - Detailed migration guide
- **OPTIMIZATION_SUMMARY.md** - Complete summary
- **AddAgencyScreen.optimized.tsx** - Working example

---

**Keep this card handy for quick reference! 📌**
