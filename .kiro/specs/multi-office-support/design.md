# Design Document: Multi-Office Support

## Overview

This design document outlines the architecture and implementation approach for adding multi-office support to the YashRoadlines application. The system will allow the business to manage multiple office locations (e.g., "Prem Darvaja Office" and "Aslali Office") with complete data segregation while maintaining a unified user experience.

The design follows a context-based approach where the currently selected office determines which data is displayed and where new entries are stored. Admin users will have the ability to switch between offices and view consolidated data, while regular users will be restricted to their assigned office.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Native App                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │           OfficeContext (New)                        │   │
│  │  - Current Office State                              │   │
│  │  - Office Switcher Logic                             │   │
│  │  - Office Permissions                                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           UserAccessContext (Enhanced)               │   │
│  │  - User Permissions                                  │   │
│  │  - Office Assignments                                │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │              UI Components                           │   │
│  │  - OfficeSelector (Header Dropdown)                  │   │
│  │  - OfficeIndicator (Display Current Office)          │   │
│  │  - Enhanced Screens (Office-Filtered Data)           │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Data Layer (Enhanced)                      │   │
│  │  - Storage.ts (Office-Aware CRUD)                    │   │
│  │  - AsyncStorage (Local Cache with Office ID)         │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Supabase Backend                        │   │
│  │  - offices table (New)                               │   │
│  │  - user_profiles (Enhanced with office_id)           │   │
│  │  - All transaction tables (Enhanced with office_id)  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Login** → Load user profile with office assignment
2. **Office Context Initialization** → Set current office based on user assignment
3. **Data Queries** → All queries automatically filtered by current office_id
4. **Data Mutations** → All new entries automatically tagged with current office_id
5. **Office Switch (Admin Only)** → Update context → Reload all screens with new office data

## Components and Interfaces

### 1. Database Schema Changes

#### New Table: `offices`

```sql
CREATE TABLE offices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_offices_name ON offices(name);
CREATE INDEX idx_offices_is_active ON offices(is_active);
```

#### Enhanced Table: `user_profiles`

```sql
-- Add office_id column to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN office_id UUID REFERENCES offices(id);

-- Index for faster lookups
CREATE INDEX idx_user_profiles_office_id ON user_profiles(office_id);
```

#### Enhanced Transaction Tables

All transaction tables will be enhanced with `office_id`:

- `agency_payments`
- `agency_majuri`
- `driver_transactions`
- `truck_fuel_entries`
- `general_entries`
- `agency_entries`
- `uppad_jama_entries`
- `cash_records`

```sql
-- Example for agency_payments (repeat for all transaction tables)
ALTER TABLE agency_payments 
ADD COLUMN office_id UUID REFERENCES offices(id);

CREATE INDEX idx_agency_payments_office_id ON agency_payments(office_id);
```

### 2. OfficeContext (New Context)

**File:** `src/context/OfficeContext.tsx`

```typescript
interface Office {
  id: string;
  name: string;
  address?: string;
  is_active: boolean;
}

interface OfficeContextType {
  currentOffice: Office | null;
  availableOffices: Office[];
  isLoading: boolean;
  canSwitchOffice: boolean; // true for admin, false for regular users
  switchOffice: (officeId: string) => Promise<void>;
  refreshOffices: () => Promise<void>;
}
```

**Responsibilities:**
- Maintain current office state
- Load available offices for the user
- Handle office switching logic
- Persist office selection in AsyncStorage
- Provide office context to all screens

**Key Methods:**
- `initializeOfficeContext()`: Load user's office assignment on app start
- `switchOffice(officeId)`: Change current office and reload data
- `refreshOffices()`: Reload office list from backend
- `getCurrentOfficeId()`: Get current office ID for queries

### 3. Enhanced UserAccessContext

**File:** `src/context/UserAccessContext.tsx` (Enhanced)

```typescript
interface UserAccessContextType {
  // Existing fields
  isAdmin: boolean;
  screenAccess: ScreenAccess;
  hasScreenAccess: (screenName: string) => boolean;
  refreshPermissions: () => Promise<void>;
  isLoading: boolean;
  lastUpdated: number;
  
  // New fields for office support
  assignedOfficeId: string | null;
  assignedOfficeName: string | null;
  canAccessMultipleOffices: boolean;
}
```

**Enhancements:**
- Load office assignment from user profile
- Determine if user can switch offices (admin only)
- Provide office information to UI components

### 4. UI Components

#### OfficeSelector Component

**File:** `src/components/OfficeSelector.tsx`

**Purpose:** Dropdown in header for admin to switch offices

**Props:**
```typescript
interface OfficeSelectorProps {
  visible: boolean; // Only visible for admin users
  currentOffice: Office | null;
  availableOffices: Office[];
  onOfficeChange: (officeId: string) => void;
}
```

**Features:**
- Dropdown list of all offices
- "All Offices" option for consolidated view
- Visual indicator of current selection
- Smooth transition animation

#### OfficeIndicator Component

**File:** `src/components/OfficeIndicator.tsx`

**Purpose:** Display current office name in header

**Props:**
```typescript
interface OfficeIndicatorProps {
  officeName: string;
  isAdmin: boolean;
}
```

**Features:**
- Always visible in app header
- Different styling for admin vs regular users
- Clickable for admin (opens OfficeSelector)
- Static display for regular users

#### Enhanced Header Component

**File:** `src/components/CommonHeader.tsx` (Enhanced)

**Layout for Admin:**
```
┌─────────────────────────────────────────────────┐
│  [Back] App Title    [Name | Role | Office ▼]   │
└─────────────────────────────────────────────────┘
```

**Layout for Regular User:**
```
┌─────────────────────────────────────────────────┐
│  [Back] App Title    [Name | Role | Office]     │
└─────────────────────────────────────────────────┘
```

### 5. Enhanced Screens

All screens that display or create data will be enhanced to:

1. **Filter data by current office_id**
2. **Tag new entries with current office_id**
3. **Display office indicator in header**

**Affected Screens:**
- `HomeScreen.tsx`
- `DailyReportScreen.tsx`
- `AddGeneralEntryScreen.tsx`
- `AgencyPaymentScreen.tsx`
- `DriverDetailsScreen.tsx`
- `ManageCashScreen.tsx`
- `UppadJamaScreen.tsx`
- `MonthlyStatementScreen.tsx`
- `UserAccessManagementScreen.tsx` (Enhanced with office assignment)

### 6. Enhanced Storage Layer

**File:** `src/data/Storage.ts` (Enhanced)

**New Functions:**

```typescript
// Office Management
export const getOffices = async (): Promise<Office[]>
export const getOfficeById = async (id: string): Promise<Office | null>
export const createOffice = async (name: string, address?: string): Promise<Office | null>
export const updateOffice = async (id: string, updates: Partial<Office>): Promise<boolean>
export const deleteOffice = async (id: string): Promise<boolean>

// Office Context Helpers
export const getUserOfficeAssignment = async (userId: string): Promise<string | null>
export const setUserOfficeAssignment = async (userId: string, officeId: string): Promise<boolean>

// Enhanced Query Functions (all existing functions will be enhanced)
// Example:
export const getAgencyPayments = async (officeId?: string): Promise<AgencyPayment[]>
export const getAllTransactionsForDate = async (date: Date, officeId?: string): Promise<Transaction[]>
```

**Key Changes:**
- All query functions will accept optional `officeId` parameter
- If `officeId` is provided, filter by that office
- If `officeId` is null and user is admin, return all data
- All save functions will automatically include current `office_id`

## Data Models

### Office Model

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

### Enhanced UserProfile Model

```typescript
export interface UserProfile {
  id: string;
  username?: string;
  full_name: string;
  phone_number?: string;
  user_type?: 'normal' | 'majur';
  is_admin?: boolean;
  is_active?: boolean;
  screen_access?: string[];
  office_id?: string; // NEW: Assigned office
  office_name?: string; // NEW: Denormalized for quick access
  created_at: string;
  updated_at?: string;
}
```

### Enhanced Transaction Models

All transaction interfaces will include:

```typescript
office_id?: string; // NEW: Office association
office_name?: string; // NEW: Denormalized for display
```

## Error Handling

### Office Not Found
- **Scenario:** User's assigned office is deleted
- **Handling:** Prompt admin to reassign user to a valid office
- **Fallback:** Temporarily assign to default office

### Office Switch Failure
- **Scenario:** Network error during office switch
- **Handling:** Show error message, retain current office
- **Retry:** Allow user to retry switch operation

### Data Sync Conflicts
- **Scenario:** Offline changes synced to wrong office
- **Handling:** Validate office_id before sync, log conflicts
- **Resolution:** Admin review and manual correction if needed

### Permission Denied
- **Scenario:** Non-admin user attempts to access another office
- **Handling:** Show error message, redirect to home
- **Logging:** Log unauthorized access attempts

## Testing Strategy

### Unit Tests

1. **OfficeContext Tests**
   - Test office initialization
   - Test office switching logic
   - Test permission checks

2. **Storage Layer Tests**
   - Test office-filtered queries
   - Test office_id tagging on save
   - Test migration logic

3. **Component Tests**
   - Test OfficeSelector rendering
   - Test OfficeIndicator display
   - Test header layout for admin vs regular user

### Integration Tests

1. **Office Assignment Flow**
   - Create user with office assignment
   - Verify user sees only assigned office data
   - Verify office indicator displays correctly

2. **Office Switching Flow (Admin)**
   - Switch office from dropdown
   - Verify data reloads for new office
   - Verify office indicator updates

3. **Data Segregation**
   - Create transactions in Office A
   - Switch to Office B
   - Verify Office A transactions not visible
   - Switch back to Office A
   - Verify transactions reappear

4. **Migration Flow**
   - Run migration script
   - Verify all existing data tagged with default office
   - Verify no data loss

### Manual Testing Checklist

- [ ] Admin can create new office
- [ ] Admin can assign user to office during creation
- [ ] Admin can switch between offices using dropdown
- [ ] Admin can view "All Offices" consolidated data
- [ ] Regular user sees only assigned office data
- [ ] Regular user cannot switch offices
- [ ] Office indicator displays correctly on all screens
- [ ] Transactions are tagged with correct office_id
- [ ] Daily report filters by current office
- [ ] Monthly statement filters by current office
- [ ] Majur dashboard filters by assigned office
- [ ] PDF reports include office information
- [ ] Offline sync maintains office associations
- [ ] Migration assigns all existing data to default office

## Performance Considerations

### Database Indexing
- Add indexes on `office_id` columns in all transaction tables
- Add index on `user_profiles.office_id`
- Monitor query performance after migration

### Caching Strategy
- Cache current office in AsyncStorage
- Cache office list in memory (refresh every 5 minutes)
- Invalidate transaction cache on office switch

### Query Optimization
- Use Supabase query filters instead of client-side filtering
- Batch office-related queries where possible
- Implement pagination for large datasets

### UI Performance
- Lazy load office list in dropdown
- Debounce office switch to prevent rapid switching
- Show loading indicator during office switch

## Security Considerations

### Access Control
- Enforce office_id filtering at database level using RLS policies
- Validate office_id on all mutations
- Prevent non-admin users from accessing other offices' data

### Row Level Security (RLS) Policies

```sql
-- Example RLS policy for agency_payments
CREATE POLICY "Users can only access their office data"
ON agency_payments
FOR SELECT
USING (
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);
```

### Audit Logging
- Log all office switches
- Log office assignments/changes
- Log unauthorized access attempts

## Migration Strategy

### Phase 1: Database Migration

1. Create `offices` table
2. Insert default office: "Prem Darvaja Office"
3. Add `office_id` column to all transaction tables
4. Add `office_id` column to `user_profiles`

### Phase 2: Data Migration

1. Update all existing transactions with default office_id
2. Update all existing users with default office_id
3. Verify data integrity

### Phase 3: Code Deployment

1. Deploy OfficeContext
2. Deploy enhanced Storage layer
3. Deploy UI components
4. Deploy enhanced screens

### Phase 4: Testing & Rollout

1. Test with admin users
2. Create "Aslali Office"
3. Assign test users to new office
4. Verify data segregation
5. Full rollout to all users

### Rollback Plan

If issues arise:
1. Revert code changes
2. Keep database changes (backward compatible)
3. System continues to work with default office
4. Fix issues and redeploy

## Future Enhancements

1. **Office-Level Settings**
   - Custom branding per office
   - Office-specific configurations
   - Office-specific reports

2. **Multi-Office Users**
   - Allow users to be assigned to multiple offices
   - Quick switch between assigned offices
   - Separate data views for each office

3. **Office Analytics**
   - Compare performance across offices
   - Office-wise revenue reports
   - Office-wise expense tracking

4. **Office Hierarchy**
   - Regional offices
   - Branch offices
   - Consolidated regional reports

## Dependencies

### New Dependencies
- None (using existing React Native and Supabase libraries)

### Database Changes
- Supabase database schema updates
- RLS policy updates

### Breaking Changes
- None (backward compatible with existing data)

## Timeline Estimate

- **Database Migration:** 2-3 hours
- **OfficeContext Implementation:** 4-6 hours
- **Storage Layer Enhancement:** 6-8 hours
- **UI Components:** 4-6 hours
- **Screen Enhancements:** 8-10 hours
- **Testing:** 6-8 hours
- **Total:** 30-41 hours (approximately 5-6 working days)
