# Multi-Office Support - Database Schema Documentation

## Overview

This document describes the database schema changes implemented to support multiple office locations in the YashRoadlines application.

## Table of Contents

1. [New Tables](#new-tables)
2. [Modified Tables](#modified-tables)
3. [Indexes](#indexes)
4. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
5. [Migration History](#migration-history)
6. [Data Relationships](#data-relationships)

---

## New Tables

### `offices` Table

Stores information about each office location.

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
```

**Columns:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key, auto-generated |
| `name` | VARCHAR(255) | No | Office name, must be unique |
| `address` | TEXT | Yes | Physical address of the office |
| `is_active` | BOOLEAN | No | Whether the office is active (default: true) |
| `created_by` | UUID | Yes | User ID who created the office |
| `created_at` | TIMESTAMP | No | Creation timestamp |
| `updated_at` | TIMESTAMP | No | Last update timestamp |

**Constraints:**
- `UNIQUE` constraint on `name` (case-insensitive)
- Foreign key to `auth.users(id)` for `created_by`

**Indexes:**
- Primary key index on `id`
- Unique index on `name`
- Index on `is_active` for filtering active offices

---

## Modified Tables

### `user_profiles` Table

Enhanced to include office assignment.

**New Columns:**

```sql
ALTER TABLE user_profiles 
ADD COLUMN office_id UUID REFERENCES offices(id);
```

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `office_id` | UUID | Yes | Foreign key to offices table |

**Index:**
```sql
CREATE INDEX idx_user_profiles_office_id ON user_profiles(office_id);
```

### Transaction Tables

All transaction tables have been enhanced with `office_id` column:

1. `agency_payments`
2. `agency_majuri`
3. `driver_transactions`
4. `truck_fuel_entries`
5. `general_entries`
6. `agency_entries`
7. `uppad_jama_entries`
8. `cash_records`
9. `daily_cash_adjustments`

**Schema Change (Applied to All):**

```sql
ALTER TABLE [table_name] 
ADD COLUMN office_id UUID REFERENCES offices(id);

CREATE INDEX idx_[table_name]_office_id ON [table_name](office_id);
```

**Example for `agency_payments`:**

```sql
ALTER TABLE agency_payments 
ADD COLUMN office_id UUID REFERENCES offices(id);

CREATE INDEX idx_agency_payments_office_id ON agency_payments(office_id);
```

---

## Indexes

### Performance Optimization Indexes

All indexes are designed to optimize query performance when filtering by office.

**Office Table Indexes:**

```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX offices_pkey ON offices(id);

-- Unique office name
CREATE UNIQUE INDEX offices_name_key ON offices(name);

-- Active offices filter
CREATE INDEX idx_offices_is_active ON offices(is_active);
```

**User Profiles Index:**

```sql
CREATE INDEX idx_user_profiles_office_id ON user_profiles(office_id);
```

**Transaction Table Indexes:**

Each transaction table has an index on `office_id`:

```sql
CREATE INDEX idx_agency_payments_office_id ON agency_payments(office_id);
CREATE INDEX idx_agency_majuri_office_id ON agency_majuri(office_id);
CREATE INDEX idx_driver_transactions_office_id ON driver_transactions(office_id);
CREATE INDEX idx_truck_fuel_entries_office_id ON truck_fuel_entries(office_id);
CREATE INDEX idx_general_entries_office_id ON general_entries(office_id);
CREATE INDEX idx_agency_entries_office_id ON agency_entries(office_id);
CREATE INDEX idx_uppad_jama_entries_office_id ON uppad_jama_entries(office_id);
CREATE INDEX idx_cash_records_office_id ON cash_records(office_id);
CREATE INDEX idx_daily_cash_adjustments_office_id ON daily_cash_adjustments(office_id);
```

**Composite Indexes for Common Queries:**

```sql
-- Optimize date + office queries
CREATE INDEX idx_agency_payments_date_office ON agency_payments(date, office_id);
CREATE INDEX idx_driver_transactions_date_office ON driver_transactions(date, office_id);
CREATE INDEX idx_general_entries_date_office ON general_entries(date, office_id);
```

---

## Row Level Security (RLS) Policies

### Office Table Policies

**View Offices:**
```sql
CREATE POLICY "Users can view active offices"
ON offices
FOR SELECT
USING (is_active = true);
```

**Manage Offices (Admin Only):**
```sql
CREATE POLICY "Admins can manage offices"
ON offices
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);
```

### Transaction Table Policies

Applied to all transaction tables (example for `agency_payments`):

**View Transactions:**
```sql
CREATE POLICY "Users can view their office transactions"
ON agency_payments
FOR SELECT
USING (
  -- User's assigned office
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
  OR
  -- Admin can see all
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);
```

**Insert Transactions:**
```sql
CREATE POLICY "Users can insert transactions for their office"
ON agency_payments
FOR INSERT
WITH CHECK (
  -- Must be user's assigned office
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
  OR
  -- Admin can insert for any office
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);
```

**Update Transactions:**
```sql
CREATE POLICY "Users can update their office transactions"
ON agency_payments
FOR UPDATE
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

**Delete Transactions:**
```sql
CREATE POLICY "Admins can delete transactions"
ON agency_payments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);
```

---

## Migration History

### Migration 009: Initial Multi-Office Support

**File:** `supabase/migrations/009_add_multi_office_support.sql`

**Changes:**
- Created `offices` table
- Added `office_id` to `user_profiles`
- Added `office_id` to all transaction tables
- Created indexes for performance

**Applied:** [Date when migration was applied]

### Migration 010: RLS Policies

**File:** `supabase/migrations/010_add_rls_policies_for_offices.sql`

**Changes:**
- Added RLS policies for `offices` table
- Added RLS policies for all transaction tables
- Enabled RLS on all affected tables

**Applied:** [Date when migration was applied]

### Migration 011: Data Migration

**File:** `supabase/migrations/011_migrate_existing_data_to_default_office.sql`

**Changes:**
- Created default office "Prem Darvaja Office"
- Updated all existing transactions with default office_id
- Updated all existing users with default office_id
- Added data integrity verification

**Applied:** [Date when migration was applied]

### Migration 012: Daily Cash Adjustments

**File:** `supabase/migrations/012_add_office_id_to_daily_cash_adjustments.sql`

**Changes:**
- Added `office_id` to `daily_cash_adjustments` table
- Created index on `office_id`
- Added RLS policies for office-based access

**Applied:** [Date when migration was applied]

### Migration 013: Performance Optimization

**File:** `supabase/migrations/013_optimize_office_indexes.sql`

**Changes:**
- Added composite indexes for common date + office queries
- Optimized existing indexes
- Added query performance monitoring

**Applied:** [Date when migration was applied]

---

## Data Relationships

### Entity Relationship Diagram

```
┌─────────────────┐
│     offices     │
│─────────────────│
│ id (PK)         │
│ name (UNIQUE)   │
│ address         │
│ is_active       │
│ created_by      │
│ created_at      │
│ updated_at      │
└─────────────────┘
         │
         │ 1:N
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
┌─────────────────┐              ┌─────────────────────┐
│ user_profiles   │              │ Transaction Tables  │
│─────────────────│              │─────────────────────│
│ id (PK)         │              │ id (PK)             │
│ office_id (FK)  │              │ office_id (FK)      │
│ full_name       │              │ date                │
│ is_admin        │              │ amount              │
│ ...             │              │ ...                 │
└─────────────────┘              └─────────────────────┘
```

### Relationships

**offices → user_profiles**
- Type: One-to-Many
- Foreign Key: `user_profiles.office_id` → `offices.id`
- Description: Each office can have multiple users assigned

**offices → transaction tables**
- Type: One-to-Many
- Foreign Key: `[table].office_id` → `offices.id`
- Description: Each office can have multiple transactions

**Cascade Behavior:**
- `ON DELETE`: No cascade (prevents accidental deletion)
- `ON UPDATE`: Cascade (office ID updates propagate)

---

## Query Examples

### Get All Offices

```sql
SELECT * FROM offices 
WHERE is_active = true 
ORDER BY name;
```

### Get User's Assigned Office

```sql
SELECT o.* 
FROM offices o
JOIN user_profiles up ON up.office_id = o.id
WHERE up.id = '[user_id]';
```

### Get Transactions for Specific Office

```sql
SELECT * FROM agency_payments
WHERE office_id = '[office_id]'
  AND date = '[date]'
ORDER BY created_at DESC;
```

### Get All Transactions Across Offices (Admin)

```sql
SELECT 
  ap.*,
  o.name as office_name
FROM agency_payments ap
JOIN offices o ON o.id = ap.office_id
WHERE date = '[date]'
ORDER BY o.name, ap.created_at DESC;
```

### Count Transactions by Office

```sql
SELECT 
  o.name as office_name,
  COUNT(ap.id) as transaction_count,
  SUM(ap.amount) as total_amount
FROM offices o
LEFT JOIN agency_payments ap ON ap.office_id = o.id
WHERE ap.date = '[date]'
GROUP BY o.id, o.name
ORDER BY o.name;
```

---

## Backup and Recovery

### Before Migration

Always backup your database before applying migrations:

```bash
# Using Supabase CLI
supabase db dump -f backup_before_migration.sql

# Or using pg_dump
pg_dump -h [host] -U [user] -d [database] > backup.sql
```

### Rollback Strategy

If issues occur after migration:

1. **Stop Application**: Prevent new data from being created
2. **Restore Backup**: Use the backup created before migration
3. **Investigate Issue**: Review migration logs and errors
4. **Fix Migration**: Correct the migration script
5. **Reapply**: Apply the corrected migration

---

## Performance Considerations

### Index Usage

All queries filtering by `office_id` will use the indexes:

```sql
EXPLAIN ANALYZE
SELECT * FROM agency_payments 
WHERE office_id = '[office_id]' AND date = '[date]';
```

Expected: Index scan on `idx_agency_payments_date_office`

### Query Optimization

- Always include `office_id` in WHERE clauses
- Use composite indexes for date + office queries
- Avoid SELECT * in production queries
- Use LIMIT for large result sets

### Monitoring

Monitor query performance using:

```sql
-- Check index usage
SELECT * FROM pg_stat_user_indexes 
WHERE schemaname = 'public';

-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

---

## Security Notes

### Data Isolation

- RLS policies ensure users only see their office data
- Admin users can bypass office restrictions
- All policies are enforced at the database level

### Audit Trail

Consider adding audit logging for:
- Office creation/deletion
- User office assignment changes
- Cross-office data access attempts

### Best Practices

- Never disable RLS on production tables
- Regularly review RLS policies
- Test policies with different user roles
- Monitor for unauthorized access attempts

---

**Last Updated**: February 2026  
**Version**: 1.0  
**Database Version**: PostgreSQL 14+ (Supabase)
