# Offline Sync with Office Support - Implementation Summary

## Overview

This implementation enhances the existing offline sync mechanism to support multi-office functionality. All pending operations now include `office_id` associations, and the sync process validates office assignments before syncing to the backend.

## Key Features Implemented

### 1. Enhanced SyncManager Class

The `SyncManager` class in `src/data/Storage.ts` has been significantly enhanced with the following features:

#### Office-Aware Pending Operations
- All pending operations now include an `office_id` field
- Operations are tracked with their associated office for proper data segregation

#### Office Validation Before Sync
- Before syncing any operation, the system validates that the `office_id` is still valid
- Checks include:
  - Office still exists in the database
  - Office is still active
  - For UPDATE operations, verifies the record's office_id matches

#### Conflict Resolution
- **Office No Longer Exists**: Automatically reassigns to the default (first active) office
- **Office Inactive**: Reassigns to the default office
- **Office Mismatch**: Prioritizes server data and updates local operation to match

#### Retry Logic
- Failed operations are retried up to 3 times
- After max retries, operations are removed from the queue
- Retry count is tracked per operation

#### Conflict Logging
- All sync conflicts are logged with detailed information
- Logs include:
  - Operation ID
  - Table name
  - Record ID
  - Conflict reason
  - Local and server office IDs
  - Timestamp
- Conflicts can be reviewed by admins for manual resolution if needed

### 2. Updated Save Functions

All save functions have been updated to include `office_id` when adding pending operations:

- `saveAgencyPayment` - Includes office_id from payment data
- `saveAgencyMajuri` - Includes office_id from majuri data
- `saveDriverTransaction` - Includes office_id from transaction data
- `saveTruckFuel` - Includes office_id from fuel entry data
- `saveGeneralEntry` - Includes office_id from entry data
- `saveAgencyEntry` - Includes office_id from entry data
- `saveUppadJamaEntry` - Includes office_id from entry data
- `saveAgency` - No office_id (agencies are not office-specific)
- `savePerson` - No office_id (persons are not office-specific)
- Delete operations - Extracts office_id from the record being deleted

### 3. New Exported Functions

The following functions are now available for use throughout the app:

```typescript
// Manually trigger sync of all pending operations
export const syncPendingOperations = async (): Promise<boolean>

// Get the count of pending sync operations
export const getPendingOperationsCount = async (): Promise<number>

// Get all logged sync conflicts
export const getSyncConflicts = async (): Promise<any[]>

// Clear all logged sync conflicts
export const clearSyncConflicts = async (): Promise<void>

// Get detailed sync status including pending operations and conflicts
export const getDetailedSyncStatus = async (): Promise<{
  pendingCount: number;
  conflictCount: number;
  lastSync: string | null;
  conflicts: any[];
}>
```

## Data Structures

### PendingOperation Interface
```typescript
interface PendingOperation {
  id: string;                    // Unique operation ID
  table: string;                 // Database table name
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;                     // The data to sync
  office_id?: string;            // Associated office ID
  timestamp: string;             // When operation was queued
  retryCount?: number;           // Number of retry attempts
}
```

### SyncConflict Interface
```typescript
interface SyncConflict {
  operationId: string;           // ID of the conflicting operation
  table: string;                 // Database table
  recordId: string;              // Record ID
  reason: string;                // Conflict reason
  localOfficeId?: string;        // Office ID in local operation
  serverOfficeId?: string;       // Office ID on server
  timestamp: string;             // When conflict occurred
}
```

## Sync Flow

### Normal Sync Flow
1. User creates/updates data while offline
2. Operation is queued with `office_id` in AsyncStorage
3. When online, sync is triggered (manually or automatically)
4. For each pending operation:
   - Validate office_id is still valid
   - Execute operation against Supabase
   - Remove from queue if successful
   - Retry if failed (up to 3 times)

### Conflict Resolution Flow
1. Office validation fails (office deleted, inactive, or mismatch)
2. Conflict is logged with details
3. System attempts automatic resolution:
   - **Office deleted/inactive**: Reassign to default office
   - **Office mismatch**: Use server's office_id
4. If resolution succeeds, operation is synced
5. If resolution fails, operation is retried later
6. After max retries, operation is removed from queue

## Usage Examples

### Checking Sync Status
```typescript
import { getDetailedSyncStatus } from '../data/Storage';

const status = await getDetailedSyncStatus();
console.log(`Pending operations: ${status.pendingCount}`);
console.log(`Conflicts: ${status.conflictCount}`);
console.log(`Last sync: ${status.lastSync}`);
```

### Manually Triggering Sync
```typescript
import { syncPendingOperations } from '../data/Storage';

const success = await syncPendingOperations();
if (success) {
  console.log('All operations synced successfully');
} else {
  console.log('Some operations failed to sync');
}
```

### Reviewing Conflicts
```typescript
import { getSyncConflicts, clearSyncConflicts } from '../data/Storage';

const conflicts = await getSyncConflicts();
conflicts.forEach(conflict => {
  console.log(`Conflict in ${conflict.table}:`, conflict.reason);
  console.log(`Local office: ${conflict.localOfficeId}`);
  console.log(`Server office: ${conflict.serverOfficeId}`);
});

// After reviewing, clear conflicts
await clearSyncConflicts();
```

## Testing Scenarios

### Scenario 1: Normal Offline Operation
1. User goes offline
2. User creates a transaction in Office A
3. Transaction is queued with office_id
4. User comes back online
5. Sync runs automatically
6. Transaction is synced to Supabase with correct office_id

### Scenario 2: Office Deleted While Offline
1. User goes offline
2. User creates transaction in Office B
3. Admin deletes Office B while user is offline
4. User comes back online
5. Sync detects office no longer exists
6. Transaction is reassigned to default office
7. Conflict is logged for admin review

### Scenario 3: Office Mismatch
1. User creates transaction in Office A
2. Transaction fails to sync initially
3. Admin changes the record's office to Office B on server
4. Sync retries the operation
5. Detects office mismatch
6. Uses server's office_id (Office B)
7. Conflict is logged

## Requirements Satisfied

✅ **Requirement 7.1**: Office identifiers are included in all API requests (sync operations)
✅ **Requirement 7.2**: Office associations are validated when receiving data from backend
✅ **Requirement 7.3**: Sync conflicts prioritize server data and log conflicts
✅ **Requirement 7.4**: Offline changes maintain office associations through the sync process

## Performance Considerations

- **Validation Overhead**: Each operation requires 1-2 database queries for validation
- **Conflict Logging**: Conflicts are stored in AsyncStorage (limited to 100 most recent)
- **Retry Logic**: Failed operations are retried with exponential backoff (implicit in queue processing)
- **Batch Processing**: All pending operations are processed in a single sync session

## Future Enhancements

1. **Batch Validation**: Validate multiple office_ids in a single query
2. **Conflict UI**: Create admin screen to review and manually resolve conflicts
3. **Sync Scheduling**: Implement periodic background sync
4. **Network Detection**: Automatically trigger sync when network becomes available
5. **Conflict Notifications**: Notify admins when conflicts occur

## Maintenance Notes

- Conflict logs are automatically limited to 100 entries
- Pending operations are removed after 3 failed retry attempts
- No automatic cleanup of old conflicts - admin must manually clear
- SyncManager is a singleton - only one instance exists per app session

## Related Files

- `src/data/Storage.ts` - Main implementation
- `src/context/OfficeContext.tsx` - Office management context
- `.kiro/specs/multi-office-support/requirements.md` - Requirements document
- `.kiro/specs/multi-office-support/design.md` - Design document
