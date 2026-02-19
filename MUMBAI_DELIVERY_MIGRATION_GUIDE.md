# Mumbai Delivery Redesign - Migration Guide

## Table of Contents

1. [Overview](#overview)
2. [Database Schema Changes](#database-schema-changes)
3. [API Changes](#api-changes)
4. [Migration Steps](#migration-steps)
5. [New Features](#new-features)
6. [Usage Guide](#usage-guide)
7. [Troubleshooting](#troubleshooting)

## Overview

The Mumbai Delivery Redesign transforms the single-screen delivery entry system into a comprehensive two-screen workflow with payment confirmation and photo proof capabilities. This guide provides detailed instructions for migrating from the legacy system to the new implementation.

### Key Changes

- **Two-Screen Workflow**: Separate screens for data entry and payment confirmation
- **Enhanced Data Model**: Extended schema with billty number, consignee information, and confirmation status
- **Photo Proof**: Capture and store bilty and signature photos
- **Status Tracking**: Visual separation of pending and confirmed deliveries
- **Offline Support**: Full offline-first operation with automatic synchronization
- **Multi-Office Support**: Office-based data isolation and filtering

### Migration Timeline

1. **Database Migration**: Apply schema changes (15-30 minutes)
2. **Data Migration**: Migrate existing records (30-60 minutes depending on data volume)
3. **App Update**: Deploy new app version to users
4. **User Training**: Train users on new workflow (1-2 hours)

## Database Schema Changes

### New Table: delivery_photos

Stores photo metadata and references for bilty and signature photos.

```sql
CREATE TABLE delivery_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_record_id UUID NOT NULL REFERENCES agency_entries(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('bilty', 'signature')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded BOOLEAN DEFAULT FALSE,
  upload_url TEXT,
  office_id UUID REFERENCES offices(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```


**Indexes**:
```sql
CREATE INDEX idx_delivery_photos_record_id ON delivery_photos(delivery_record_id);
CREATE INDEX idx_delivery_photos_office_id ON delivery_photos(office_id);
```

### Extended Table: agency_entries

New columns added to support the enhanced delivery workflow.

```sql
-- Delivery identification and details
ALTER TABLE agency_entries ADD COLUMN IF NOT EXISTS billty_no TEXT;
ALTER TABLE agency_entries ADD COLUMN IF NOT EXISTS consignee_name TEXT;
ALTER TABLE agency_entries ADD COLUMN IF NOT EXISTS item_description TEXT;

-- Confirmation tracking
ALTER TABLE agency_entries ADD COLUMN IF NOT EXISTS confirmation_status TEXT DEFAULT 'pending' 
  CHECK (confirmation_status IN ('pending', 'confirmed'));
ALTER TABLE agency_entries ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE agency_entries ADD COLUMN IF NOT EXISTS confirmed_amount NUMERIC(10, 2);

-- Photo references
ALTER TABLE agency_entries ADD COLUMN IF NOT EXISTS bilty_photo_id UUID REFERENCES delivery_photos(id);
ALTER TABLE agency_entries ADD COLUMN IF NOT EXISTS signature_photo_id UUID REFERENCES delivery_photos(id);

-- Status flags
ALTER TABLE agency_entries ADD COLUMN IF NOT EXISTS taken_from_godown BOOLEAN DEFAULT FALSE;
ALTER TABLE agency_entries ADD COLUMN IF NOT EXISTS payment_received BOOLEAN DEFAULT FALSE;
```

**Indexes**:
```sql
CREATE INDEX idx_agency_entries_billty_no ON agency_entries(billty_no);
CREATE INDEX idx_agency_entries_confirmation_status ON agency_entries(confirmation_status);
```

### Schema Compatibility

The new schema maintains **full backward compatibility** with existing AgencyEntry records:
- All new columns are optional (nullable or have defaults)
- Existing queries continue to work without modification
- Legacy records can coexist with new records

## API Changes

### New Storage Functions

#### saveDeliveryRecord()

Saves a delivery record with enhanced fields.

```typescript
export const saveDeliveryRecord = async (
  record: Partial<DeliveryRecord>
): Promise<boolean>
```

**Parameters**:
- `record.billty_no` (required): Billty/Bilty number
- `record.consignee_name` (required): Consignee name
- `record.item_description` (required): Item description
- `record.amount` (required): Delivery amount
- `record.office_id` (optional): Office ID (defaults to current office)

**Returns**: `true` on success, `false` on failure

**Behavior**:
- Validates required fields
- Sets default values: `confirmation_status='pending'`, `taken_from_godown=false`, `payment_received=false`
- Associates with current office
- Supports offline mode with sync queue


#### getDeliveryRecords()

Fetches delivery records with filtering options.

```typescript
export const getDeliveryRecords = async (
  officeId?: string,
  status?: 'pending' | 'confirmed' | 'all'
): Promise<DeliveryRecord[]>
```

**Parameters**:
- `officeId` (optional): Filter by office ID
- `status` (optional): Filter by confirmation status ('pending', 'confirmed', or 'all')

**Returns**: Array of delivery records

**Behavior**:
- Fetches from Supabase if online, falls back to AsyncStorage if offline
- Orders by confirmation_status (pending first) then entry_date descending
- Applies office and status filters

#### confirmDeliveryPayment()

Confirms payment for a delivery record.

```typescript
export const confirmDeliveryPayment = async (
  confirmation: PaymentConfirmation
): Promise<boolean>
```

**Parameters**:
- `confirmation.delivery_record_id` (required): Record ID
- `confirmation.confirmed_amount` (required): Confirmed amount
- `confirmation.bilty_photo` (required): Bilty photo data
- `confirmation.signature_photo` (required): Signature photo data

**Returns**: `true` on success, `false` on failure

**Behavior**:
- Updates record with confirmation data
- Sets `confirmation_status='confirmed'`, `confirmed_at`, `confirmed_amount`
- Sets `taken_from_godown=true`, `payment_received=true`
- Links photo records via `bilty_photo_id` and `signature_photo_id`
- Supports offline mode with sync queue

#### savePhotoRecord()

Saves photo metadata and file.

```typescript
export const savePhotoRecord = async (
  photo: Partial<PhotoRecord>
): Promise<string>
```

**Parameters**:
- `photo.delivery_record_id` (required): Associated delivery record ID
- `photo.photo_type` (required): 'bilty' or 'signature'
- `photo.file_path` (required): Local file path
- `photo.file_name` (required): File name
- `photo.file_size` (required): File size in bytes
- `photo.mime_type` (required): MIME type

**Returns**: Photo ID (UUID)

**Behavior**:
- Saves photo metadata to database
- Stores photo file locally using React Native FS
- Queues for upload if offline

#### getDeliveryPhotos()

Retrieves photos for a delivery record.

```typescript
export const getDeliveryPhotos = async (
  deliveryRecordId: string
): Promise<PhotoRecord[]>
```

**Parameters**:
- `deliveryRecordId` (required): Delivery record ID

**Returns**: Array of photo records (bilty and signature)


### Photo Manager Service

New service for photo capture and management.

```typescript
interface PhotoManager {
  capturePhoto(options: CaptureOptions): Promise<PhotoData>;
  savePhoto(photo: PhotoData, recordId: string, type: PhotoType): Promise<string>;
  getPhoto(photoId: string): Promise<PhotoData | null>;
  syncPendingPhotos(): Promise<SyncResult>;
}
```

**Methods**:
- `capturePhoto()`: Opens camera or photo library
- `savePhoto()`: Stores photo locally and queues for sync
- `getPhoto()`: Retrieves photo from local or remote storage
- `syncPendingPhotos()`: Uploads pending photos to backend

### Data Model Changes

#### DeliveryRecord Interface

Extended from AgencyEntry with new fields:

```typescript
interface DeliveryRecord extends AgencyEntry {
  // New fields
  billty_no: string;
  consignee_name: string;
  item_description: string;
  confirmation_status: 'pending' | 'confirmed';
  confirmed_at?: string;
  confirmed_amount?: number;
  bilty_photo_id?: string;
  signature_photo_id?: string;
  taken_from_godown: boolean;
  payment_received: boolean;
  
  // Existing AgencyEntry fields remain unchanged
}
```

#### PaymentConfirmation Interface

New interface for payment confirmation data:

```typescript
interface PaymentConfirmation {
  delivery_record_id: string;
  confirmed_amount: number;
  bilty_photo: PhotoData;
  signature_photo: PhotoData;
  confirmed_at: string;
  confirmed_by?: string;
}
```

#### PhotoRecord Interface

New interface for photo metadata:

```typescript
interface PhotoRecord {
  id: string;
  delivery_record_id: string;
  photo_type: 'bilty' | 'signature';
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded: boolean;
  upload_url?: string;
  office_id?: string;
  created_at: string;
  updated_at: string;
}
```

## Migration Steps

### Step 1: Backup Existing Data

**CRITICAL**: Always backup your database before migration.

```sql
-- Backup agency_entries table
CREATE TABLE agency_entries_backup AS SELECT * FROM agency_entries;

-- Verify backup
SELECT COUNT(*) FROM agency_entries_backup;
```


### Step 2: Apply Database Schema Changes

Execute the migration script `017_mumbai_delivery_redesign.sql`:

```bash
# Using Supabase CLI
supabase db push

# Or apply directly via SQL editor in Supabase Dashboard
```

**Verification**:
```sql
-- Verify new columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'agency_entries' 
  AND column_name IN ('billty_no', 'consignee_name', 'item_description', 
                      'confirmation_status', 'confirmed_at', 'confirmed_amount',
                      'bilty_photo_id', 'signature_photo_id', 
                      'taken_from_godown', 'payment_received');

-- Verify delivery_photos table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'delivery_photos';

-- Verify indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('agency_entries', 'delivery_photos')
  AND indexname LIKE 'idx_%';
```

### Step 3: Migrate Existing Data

Run the migration utility to populate new fields for existing Mumbai records:

```typescript
// Execute migration function
import { migrateExistingMumbaiRecords } from './src/utils/migrateExistingMumbaiRecords';

await migrateExistingMumbaiRecords();
```

**Migration Logic**:
- Fetches all AgencyEntry records with `agency_name='Mumbai'`
- For each record without new fields populated:
  - Maps `description` → `item_description`
  - Generates placeholder `billty_no`: `MIGRATED-{id.slice(0,8)}`
  - Sets `consignee_name` to `'Legacy Record'`
  - Maps `delivery_status` → `confirmation_status`
  - Sets `taken_from_godown` and `payment_received` based on `delivery_status`

**Verification**:
```sql
-- Check migrated records
SELECT 
  id,
  billty_no,
  consignee_name,
  item_description,
  confirmation_status,
  taken_from_godown,
  payment_received
FROM agency_entries
WHERE agency_name = 'Mumbai'
  AND billty_no LIKE 'MIGRATED-%'
LIMIT 10;

-- Count migrated vs new records
SELECT 
  CASE 
    WHEN billty_no LIKE 'MIGRATED-%' THEN 'Migrated'
    ELSE 'New'
  END AS record_type,
  COUNT(*) as count
FROM agency_entries
WHERE agency_name = 'Mumbai'
GROUP BY record_type;
```

### Step 4: Configure Photo Storage

Set up Supabase Storage bucket for delivery photos:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-photos', 'delivery-photos', false);

-- Add RLS policies for bucket
CREATE POLICY "Users can upload delivery photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'delivery-photos');

CREATE POLICY "Users can view their office's delivery photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'delivery-photos');
```

