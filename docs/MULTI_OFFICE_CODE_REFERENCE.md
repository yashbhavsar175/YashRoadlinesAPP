# Multi-Office Support - Code Reference

## Overview

This document provides a technical reference for developers working with the multi-office support feature. It includes code examples, function signatures, and implementation patterns.

## Table of Contents

1. [Context API](#context-api)
2. [Storage Layer Functions](#storage-layer-functions)
3. [Component Usage](#component-usage)
4. [Screen Integration](#screen-integration)
5. [Common Patterns](#common-patterns)

---

## Context API

### OfficeContext

**Location:** `src/context/OfficeContext.tsx`

#### Interface

```typescript
interface Office {
  id: string;
  name: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface OfficeContextType {
  // Current office state
  currentOffice: Office | null;
  availableOffices: Office[];
  isLoading: boolean;
  
  // Permissions
  canSwitchOffice: boolean; // true for admin, false for regular users
  
  // Actions
  switchOffice: (officeId: string) => Promise<void>;
  refreshOffices: () => Promise<void>;
  getCurrentOfficeId: () => string | null;
}
```

#### Usage Example

```typescript
import { useOffice } from '../context/OfficeContext';

function MyScreen() {
  const { 
    currentOffice, 
    availableOffices, 
    canSwitchOffice,
    switchOffice,
    getCurrentOfficeId 
  } = useOffice();
  
  // Get current office ID for queries
  const officeId = getCurrentOfficeId();
  
  // Load data filtered by office
  useEffect(() => {
    loadData(officeId);
  }, [officeId]);
  
  // Switch office (admin only)
  const handleOfficeChange = async (newOfficeId: string) => {
    if (canSwitchOffice) {
      await switchOffice(newOfficeId);
      // Data will reload automatically
    }
  };
  
  return (
    <View>
      <Text>Current Office: {currentOffice?.name}</Text>
    </View>
  );
}
```

#### Key Methods

**`getCurrentOfficeId()`**
- Returns the current office ID or null
- Use this for all data queries
- Returns null if no office is selected

**`switchOffice(officeId: string)`**
- Changes the current office
- Saves preference to AsyncStorage
- Triggers data reload across the app
- Only works for admin users

**`refreshOffices()`**
- Reloads the list of available offices
- Call after creating/updating offices
- Updates `availableOffices` state

---

## Storage Layer Functions

**Location:** `src/data/Storage.ts`

### Office Management Functions

#### `getOffices()`

Fetches all active offices from the database.

```typescript
/**
 * Get all active offices
 * @returns Promise<Office[]> - Array of office objects
 */
export const getOffices = async (): Promise<Office[]>
```

**Example:**
```typescript
const offices = await getOffices();
console.log('Available offices:', offices);
```

#### `getOfficeById(id: string)`

Fetches a specific office by ID.

```typescript
/**
 * Get office by ID
 * @param id - Office UUID
 * @returns Promise<Office | null> - Office object or null if not found
 */
export const getOfficeById = async (id: string): Promise<Office | null>
```

**Example:**
```typescript
const office = await getOfficeById('123e4567-e89b-12d3-a456-426614174000');
if (office) {
  console.log('Office name:', office.name);
}
```

#### `createOffice(name: string, address?: string)`

Creates a new office with uniqueness validation.

```typescript
/**
 * Create a new office
 * @param name - Office name (must be unique)
 * @param address - Optional office address
 * @returns Promise<Office | null> - Created office or null on error
 * @throws Error if office name already exists
 */
export const createOffice = async (
  name: string, 
  address?: string
): Promise<Office | null>
```

**Example:**
```typescript
try {
  const newOffice = await createOffice('Aslali Office', '123 Main St');
  if (newOffice) {
    console.log('Office created:', newOffice.id);
  }
} catch (error) {
  console.error('Failed to create office:', error);
}
```

#### `updateOffice(id: string, updates: Partial<Office>)`

Updates an existing office.

```typescript
/**
 * Update office details
 * @param id - Office UUID
 * @param updates - Partial office object with fields to update
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export const updateOffice = async (
  id: string, 
  updates: Partial<Office>
): Promise<boolean>
```

**Example:**
```typescript
const success = await updateOffice('office-id', {
  name: 'New Office Name',
  address: 'New Address'
});
```

#### `deleteOffice(id: string)`

Deletes an office (only if no transactions exist).

```typescript
/**
 * Delete an office
 * @param id - Office UUID
 * @returns Promise<boolean> - true if successful, false otherwise
 * @throws Error if office has associated transactions
 */
export const deleteOffice = async (id: string): Promise<boolean>
```

**Example:**
```typescript
try {
  const success = await deleteOffice('office-id');
  if (success) {
    console.log('Office deleted');
  }
} catch (error) {
  console.error('Cannot delete office with transactions');
}
```

#### `getUserOfficeAssignment(userId: string)`

Gets the office ID assigned to a user.

```typescript
/**
 * Get user's assigned office ID
 * @param userId - User UUID
 * @returns Promise<string | null> - Office ID or null if not assigned
 */
export const getUserOfficeAssignment = async (
  userId: string
): Promise<string | null>
```

**Example:**
```typescript
const officeId = await getUserOfficeAssignment(currentUser.id);
console.log('User assigned to office:', officeId);
```

#### `setUserOfficeAssignment(userId: string, officeId: string)`

Assigns a user to an office.

```typescript
/**
 * Assign user to an office
 * @param userId - User UUID
 * @param officeId - Office UUID
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export const setUserOfficeAssignment = async (
  userId: string, 
  officeId: string
): Promise<boolean>
```

**Example:**
```typescript
const success = await setUserOfficeAssignment(userId, officeId);
if (success) {
  console.log('User assigned to office');
}
```

### Enhanced Query Functions

All query functions now accept an optional `officeId` parameter.

#### Pattern

```typescript
/**
 * Get transactions filtered by office
 * @param officeId - Optional office UUID (null = all offices for admin)
 * @returns Promise<Transaction[]> - Array of transactions
 */
export const getTransactions = async (
  officeId?: string | null
): Promise<Transaction[]>
```

#### Examples

**Get Agency Payments for Current Office:**
```typescript
import { useOffice } from '../context/OfficeContext';

const { getCurrentOfficeId } = useOffice();
const officeId = getCurrentOfficeId();

const payments = await getAgencyPayments(officeId);
```

**Get All Transactions (Admin):**
```typescript
// Pass null to get all offices
const allPayments = await getAgencyPayments(null);
```

**Get Transactions for Specific Date and Office:**
```typescript
const transactions = await getAllTransactionsForDate(
  new Date('2026-02-09'),
  officeId
);
```

### Enhanced Save Functions

All save functions automatically include the current office ID.

#### Pattern

```typescript
/**
 * Save transaction with office association
 * @param data - Transaction data
 * @param officeId - Office UUID (required)
 * @returns Promise<Transaction | null> - Saved transaction or null on error
 */
export const saveTransaction = async (
  data: TransactionData,
  officeId: string
): Promise<Transaction | null>
```

#### Example

```typescript
import { useOffice } from '../context/OfficeContext';

const { getCurrentOfficeId } = useOffice();

const handleSave = async () => {
  const officeId = getCurrentOfficeId();
  
  if (!officeId) {
    Alert.alert('Error', 'No office selected');
    return;
  }
  
  const saved = await saveAgencyPayment({
    agency_name: 'ABC Transport',
    amount: 5000,
    date: new Date(),
    // ... other fields
  }, officeId);
  
  if (saved) {
    Alert.alert('Success', 'Payment saved');
  }
};
```

---

## Component Usage

### OfficeSelector

**Location:** `src/components/OfficeSelector.tsx`

Dropdown component for office selection (admin only).

#### Props

```typescript
interface OfficeSelectorProps {
  visible: boolean;           // Show/hide dropdown
  currentOffice: Office | null;
  availableOffices: Office[];
  onOfficeChange: (officeId: string) => void;
  style?: ViewStyle;
}
```

#### Usage

```typescript
import OfficeSelector from '../components/OfficeSelector';
import { useOffice } from '../context/OfficeContext';

function Header() {
  const { 
    currentOffice, 
    availableOffices, 
    canSwitchOffice,
    switchOffice 
  } = useOffice();
  
  return (
    <OfficeSelector
      visible={canSwitchOffice}
      currentOffice={currentOffice}
      availableOffices={availableOffices}
      onOfficeChange={switchOffice}
    />
  );
}
```

### OfficeIndicator

**Location:** `src/components/OfficeIndicator.tsx`

Displays the current office name in the header.

#### Props

```typescript
interface OfficeIndicatorProps {
  officeName: string;
  isAdmin: boolean;
  onPress?: () => void;  // Optional, for admin to open selector
  style?: ViewStyle;
}
```

#### Usage

```typescript
import OfficeIndicator from '../components/OfficeIndicator';
import { useOffice } from '../context/OfficeContext';
import { useUserAccess } from '../context/UserAccessContext';

function Header() {
  const { currentOffice } = useOffice();
  const { isAdmin } = useUserAccess();
  
  return (
    <OfficeIndicator
      officeName={currentOffice?.name || 'No Office'}
      isAdmin={isAdmin}
    />
  );
}
```

---

## Screen Integration

### Pattern for Enhancing Screens

All screens that display or create data should follow this pattern:

```typescript
import React, { useEffect, useState } from 'react';
import { useOffice } from '../context/OfficeContext';
import { getTransactions, saveTransaction } from '../data/Storage';

function MyScreen() {
  const { getCurrentOfficeId } = useOffice();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Load data when office changes
  useEffect(() => {
    loadData();
  }, [getCurrentOfficeId()]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const officeId = getCurrentOfficeId();
      const transactions = await getTransactions(officeId);
      setData(transactions);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async (formData) => {
    const officeId = getCurrentOfficeId();
    
    if (!officeId) {
      Alert.alert('Error', 'No office selected');
      return;
    }
    
    const saved = await saveTransaction(formData, officeId);
    
    if (saved) {
      Alert.alert('Success', 'Data saved');
      loadData(); // Reload data
    }
  };
  
  return (
    <View>
      {/* Your UI */}
    </View>
  );
}
```

### Key Points

1. **Import OfficeContext**: Always import and use `useOffice()`
2. **Get Office ID**: Use `getCurrentOfficeId()` for all queries
3. **Reload on Office Change**: Use `useEffect` with office ID dependency
4. **Validate Office**: Check if office ID exists before saving
5. **Pass Office ID**: Include office ID in all save operations

---

## Common Patterns

### Pattern 1: Loading Data with Office Filter

```typescript
const loadData = async () => {
  const officeId = getCurrentOfficeId();
  
  // For regular users, officeId will be their assigned office
  // For admins, officeId can be any office or null (all offices)
  const data = await getTransactions(officeId);
  
  setData(data);
};
```

### Pattern 2: Saving Data with Office Association

```typescript
const handleSave = async (formData) => {
  const officeId = getCurrentOfficeId();
  
  if (!officeId) {
    Alert.alert('Error', 'Please select an office');
    return;
  }
  
  const result = await saveTransaction({
    ...formData,
    office_id: officeId  // Explicitly include office_id
  });
  
  if (result) {
    // Success
  }
};
```

### Pattern 3: Admin vs Regular User Logic

```typescript
import { useUserAccess } from '../context/UserAccessContext';
import { useOffice } from '../context/OfficeContext';

function MyComponent() {
  const { isAdmin } = useUserAccess();
  const { canSwitchOffice, getCurrentOfficeId } = useOffice();
  
  const loadData = async () => {
    const officeId = getCurrentOfficeId();
    
    if (isAdmin && !officeId) {
      // Admin viewing "All Offices"
      const allData = await getTransactions(null);
      setData(allData);
    } else {
      // Specific office (admin or regular user)
      const officeData = await getTransactions(officeId);
      setData(officeData);
    }
  };
  
  return (
    <View>
      {canSwitchOffice && (
        <Text>You can switch offices</Text>
      )}
    </View>
  );
}
```

### Pattern 4: Displaying Office Information

```typescript
import { useOffice } from '../context/OfficeContext';

function EntryForm() {
  const { currentOffice } = useOffice();
  
  return (
    <View>
      <Text style={styles.label}>Office:</Text>
      <Text style={styles.value}>{currentOffice?.name}</Text>
      
      {/* Rest of form */}
    </View>
  );
}
```

### Pattern 5: Handling Office Switch

```typescript
import { useOffice } from '../context/OfficeContext';

function OfficeManagement() {
  const { switchOffice, refreshOffices } = useOffice();
  
  const handleCreateOffice = async (name, address) => {
    const newOffice = await createOffice(name, address);
    
    if (newOffice) {
      // Refresh office list
      await refreshOffices();
      
      // Optionally switch to new office
      await switchOffice(newOffice.id);
    }
  };
  
  return (
    <View>
      {/* Office management UI */}
    </View>
  );
}
```

### Pattern 6: Error Handling

```typescript
const handleSave = async (data) => {
  try {
    const officeId = getCurrentOfficeId();
    
    if (!officeId) {
      throw new Error('No office selected');
    }
    
    const result = await saveTransaction(data, officeId);
    
    if (!result) {
      throw new Error('Failed to save transaction');
    }
    
    Alert.alert('Success', 'Transaction saved');
    
  } catch (error) {
    console.error('Save error:', error);
    Alert.alert('Error', error.message || 'Failed to save');
  }
};
```

### Pattern 7: Offline Sync with Office

```typescript
import { useOffice } from '../context/OfficeContext';

const syncOfflineData = async () => {
  const officeId = getCurrentOfficeId();
  
  // Get pending operations from AsyncStorage
  const pendingOps = await getPendingOperations();
  
  for (const op of pendingOps) {
    // Validate office_id before syncing
    if (op.office_id !== officeId) {
      console.warn('Office mismatch, skipping:', op);
      continue;
    }
    
    // Sync to backend
    await syncOperation(op);
  }
};
```

---

## TypeScript Interfaces

### Office Interface

```typescript
export interface Office {
  id: string;
  name: string;
  address?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}
```

### Enhanced Transaction Interfaces

All transaction interfaces include:

```typescript
export interface Transaction {
  id: string;
  // ... existing fields
  office_id?: string;      // Office association
  office_name?: string;    // Denormalized for display
}
```

### Enhanced UserProfile Interface

```typescript
export interface UserProfile {
  id: string;
  full_name: string;
  // ... existing fields
  office_id?: string;      // Assigned office
  office_name?: string;    // Denormalized for display
}
```

---

## Testing

### Unit Test Example

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useOffice } from '../context/OfficeContext';

describe('OfficeContext', () => {
  it('should switch office', async () => {
    const { result } = renderHook(() => useOffice());
    
    await act(async () => {
      await result.current.switchOffice('office-id');
    });
    
    expect(result.current.currentOffice?.id).toBe('office-id');
  });
});
```

### Integration Test Example

```typescript
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MyScreen from '../screens/MyScreen';

describe('MyScreen with Office Support', () => {
  it('should load data for current office', async () => {
    const { getByText } = render(<MyScreen />);
    
    await waitFor(() => {
      expect(getByText('Prem Darvaja Office')).toBeTruthy();
    });
  });
});
```

---

## Performance Tips

1. **Cache Office List**: Office list is cached in OfficeContext
2. **Debounce Office Switch**: Prevent rapid switching
3. **Use Indexes**: All queries use database indexes on office_id
4. **Lazy Load**: Load data only when needed
5. **Memoize**: Use React.memo for office-related components

---

## Troubleshooting

### Issue: Office ID is null

**Solution**: Ensure user is assigned to an office in user_profiles table

### Issue: Data not filtering by office

**Solution**: Check that you're passing office_id to query functions

### Issue: Cannot switch office

**Solution**: Verify user has admin permissions (isAdmin = true)

### Issue: RLS policy blocking queries

**Solution**: Check that office_id matches user's assigned office

---

**Last Updated**: February 2026  
**Version**: 1.0
