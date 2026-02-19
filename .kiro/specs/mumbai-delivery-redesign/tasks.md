# Implementation Plan: Mumbai Delivery Redesign

## Overview

This implementation plan transforms the Mumbai Delivery feature from a single-screen entry system into a comprehensive two-screen workflow with payment confirmation and photo proof capabilities. The implementation follows an incremental approach, building core functionality first, then adding photo management, and finally integrating offline sync and multi-office support.

## Tasks

- [x] 1. Database schema migration and data model extensions
  - Create migration file `supabase/migrations/017_mumbai_delivery_redesign.sql`
  - Add new columns to `agency_entries` table: `billty_no`, `consignee_name`, `item_description`, `confirmation_status`, `confirmed_at`, `confirmed_amount`, `bilty_photo_id`, `signature_photo_id`, `taken_from_godown`, `payment_received`
  - Create new `delivery_photos` table with columns: `id`, `delivery_record_id`, `photo_type`, `file_path`, `file_name`, `file_size`, `mime_type`, `uploaded`, `upload_url`, `office_id`, `created_by`, `created_at`, `updated_at`
  - Add indexes for performance: `idx_agency_entries_billty_no`, `idx_agency_entries_confirmation_status`, `idx_delivery_photos_record_id`, `idx_delivery_photos_office_id`
  - Add foreign key constraints and check constraints
  - _Requirements: 1.6, 3.7, 4.5, 5.1, 5.2_

- [x] 2. Extend TypeScript interfaces and data models
  - Update `src/data/Storage.ts` to extend `AgencyEntry` interface with new fields
  - Create `DeliveryRecord` interface extending `AgencyEntry`
  - Create `PaymentConfirmation` interface
  - Create `PhotoRecord` interface
  - Create `PhotoData` interface
  - Add new offline storage keys: `DELIVERY_RECORDS`, `DELIVERY_PHOTOS`, `PENDING_PHOTO_UPLOADS`
  - _Requirements: 1.1, 3.7, 4.5_

- [ ] 3. Implement storage layer functions for delivery records
  - [x] 3.1 Implement `saveDeliveryRecord()` function
    - Handle both create and update operations
    - Validate required fields (billty_no, consignee_name, item_description, amount)
    - Set default values: `confirmation_status='pending'`, `taken_from_godown=false`, `payment_received=false`
    - Associate with current office_id
    - Support offline mode with sync queue
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.8_
  
  - [x] 3.2 Write property test for saveDeliveryRecord validation
    - **Property 1: Input Validation Completeness**
    - **Validates: Requirements 1.3, 1.4, 1.5, 10.1**
  
  - [x] 3.3 Write property test for new record initial state
    - **Property 3: New Record Initial State**
    - **Validates: Requirements 1.6**
  
  - [x] 3.4 Implement `getDeliveryRecords()` function
    - Fetch from Supabase if online, fallback to AsyncStorage
    - Filter by office_id parameter
    - Filter by confirmation_status parameter (pending/confirmed/all)
    - Order by confirmation_status (pending first) then entry_date descending
    - _Requirements: 2.2, 2.6, 7.2_
  
  - [x] 3.5 Write property test for office-based filtering
    - **Property 12: Office-Based Record Filtering**
    - **Validates: Requirements 7.2, 7.4**
  
  - [x] 3.6 Write property test for record ordering
    - **Property 6: Record Display Ordering**
    - **Validates: Requirements 2.2, 3.8**

- [ ] 4. Implement payment confirmation storage functions
  - [x] 4.1 Implement `confirmDeliveryPayment()` function
    - Update delivery record with confirmation data
    - Set `confirmation_status='confirmed'`
    - Set `confirmed_at` timestamp
    - Set `confirmed_amount`
    - Set `taken_from_godown=true` and `payment_received=true`
    - Link photo records via `bilty_photo_id` and `signature_photo_id`
    - Support offline mode with sync queue
    - _Requirements: 3.7, 5.1, 5.2_
  
  - [x] 4.2 Write property test for confirmation state transition
    - **Property 8: Confirmation State Transition Completeness**
    - **Validates: Requirements 3.7, 3.9, 5.1, 5.2**
  
  - [x] 4.3 Implement `savePhotoRecord()` function
    - Save photo metadata to database
    - Store photo file locally using React Native FS
    - Generate unique photo_id
    - Queue for upload if offline
    - Return photo_id
    - _Requirements: 4.5_
  
  - [x] 4.4 Implement `getDeliveryPhotos()` function
    - Fetch photo records for a delivery_record_id
    - Return both bilty and signature photos
    - Handle local and remote photo URLs
    - _Requirements: 4.5_
  
  - [x] 4.5 Write property test for photo storage persistence
    - **Property 11: Photo Storage Persistence**
    - **Validates: Requirements 4.5**

- [ ] 5. Create Photo Manager service
  - [x] 5.1 Create `src/services/PhotoManager.ts`
    - Implement `capturePhoto()` method using react-native-image-picker
    - Support both camera and library sources
    - Compress photos (quality: 0.7, maxWidth: 1920)
    - Return PhotoData object
    - _Requirements: 4.1, 4.2_
  
  - [x] 5.2 Implement photo storage methods
    - Implement `savePhoto()` method
    - Store photos in app's private directory: `${DocumentDirectoryPath}/delivery_photos/${recordId}/`
    - Generate unique filenames with timestamp
    - Save metadata to AsyncStorage
    - _Requirements: 4.5_
  
  - [x] 5.3 Implement photo retrieval methods
    - Implement `getPhoto()` method
    - Check local storage first
    - Fallback to remote URL if not found locally
    - Handle missing photos gracefully
    - _Requirements: 4.5_
  
  - [x] 5.4 Write property test for photo file type validation
    - **Property 10: Photo File Type Validation**
    - **Validates: Requirements 4.4**
  
  - [x] 5.5 Implement photo sync methods
    - Implement `syncPendingPhotos()` method
    - Upload photos to Supabase Storage bucket 'delivery-photos'
    - Use path structure: `{office_id}/{delivery_record_id}/{photo_type}_{timestamp}.jpg`
    - Update photo record with upload_url after successful upload
    - Implement retry logic with exponential backoff
    - _Requirements: 4.6, 4.7_

- [x] 6. Checkpoint - Ensure storage layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Create Data Entry Screen component
  - [x] 7.1 Create `src/screens/DataEntryScreen.tsx`
    - Set up component structure with navigation props
    - Create state for form fields: billtyNo, consigneeName, itemDescription, amount
    - Create state for saving status and recent entries
    - Use existing design system (Colors, GlobalStyles)
    - _Requirements: 1.1, 9.5_
  
  - [x] 7.2 Implement form UI with four input fields
    - Add TextInput for Billty No
    - Add TextInput for Consignee Name
    - Add TextInput for Item Description (multiline)
    - Add TextInput for Amount (numeric keyboard)
    - Add labels with required indicators
    - Use existing GlobalStyles.input styling
    - _Requirements: 1.1_
  
  - [x] 7.3 Implement form validation logic
    - Create `validateInputs()` method
    - Check billtyNo is not empty
    - Check consigneeName is not empty
    - Check itemDescription is not empty
    - Check amount is positive number
    - Return validation result with field-specific errors
    - _Requirements: 1.3, 1.4, 1.5_
  
  - [x] 7.4 Write property test for input validation
    - **Property 1: Input Validation Completeness**
    - **Validates: Requirements 1.3, 1.4, 1.5, 10.1**
  
  - [x] 7.5 Implement save button with state management
    - Create save button using GlobalStyles.buttonPrimary
    - Disable button when any required field is empty or invalid
    - Show ActivityIndicator when saving
    - _Requirements: 1.2_
  
  - [x] 7.6 Write property test for save button state
    - **Property 2: Save Button State Consistency**
    - **Validates: Requirements 1.2**
  
  - [x] 7.7 Implement handleSave method
    - Validate all inputs
    - Display field-specific error messages using AlertContext
    - Call `saveDeliveryRecord()` with form data
    - Get current office_id from OfficeContext
    - Handle success and error cases
    - Clear form on success
    - Show success message
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 10.1_
  
  - [x] 7.8 Write property test for form reset after save
    - **Property 4: Form Reset After Save**
    - **Validates: Requirements 1.7**
  
  - [x] 7.9 Add navigation to Payment Confirmation Screen
    - Add button to navigate to confirmation screen
    - Use existing navigation patterns
    - _Requirements: 9.2_
  
  - [x] 7.10 Implement duplicate billty number detection
    - Check for existing billty_no in current office before save
    - Display warning message if duplicate found
    - Allow save to proceed (warning only)
    - _Requirements: 10.5_
  
  - [x] 7.11 Write property test for duplicate detection
    - **Property 14: Duplicate Billty Number Detection**
    - **Validates: Requirements 10.5**

- [x] 8. Create Payment Confirmation Screen component
  - [x] 8.1 Create `src/screens/PaymentConfirmationScreen.tsx`
    - Set up component structure with navigation props
    - Create state for deliveryRecords, loading, refreshing, selectedRecord, popupVisible
    - Use GestureHandlerRootView wrapper
    - _Requirements: 2.1, 9.1_
  
  - [x] 8.2 Implement data loading logic
    - Create `loadDeliveryRecords()` method
    - Get current office_id from OfficeContext
    - Call `getDeliveryRecords()` with office filter
    - Separate records into pending and confirmed arrays
    - Update state with loaded data
    - _Requirements: 2.6, 7.2_
  
  - [x] 8.3 Implement table header
    - Create header row with columns: Index No, Billty No, Consignee Name, Item Description, Amount
    - Use existing card styling
    - Make header sticky if possible
    - _Requirements: 2.1_
  
  - [x] 8.4 Implement pending deliveries section
    - Render FlatList of pending records
    - Create DeliveryRow component for each record
    - Display: index number, billty_no, consignee_name, item_description, amount
    - Wrap each row with TapGestureHandler (numberOfTaps: 2)
    - _Requirements: 2.1, 2.2, 2.5_
  
  - [x] 8.5 Write property test for sequential indexing
    - **Property 7: Sequential Index Numbering**
    - **Validates: Requirements 2.5**
  
  - [x] 8.6 Implement green separator line
    - Add View with green background color (Colors.success)
    - Height: 2-3px
    - Full width
    - Place between pending and confirmed sections
    - _Requirements: 2.3_
  
  - [x] 8.7 Implement confirmed deliveries section
    - Render FlatList of confirmed records
    - Create ConfirmedDeliveryRow component
    - Include checkmark icon (Ionicons: checkmark-circle)
    - Display same columns as pending section
    - Wrap with TapGestureHandler for read-only view
    - _Requirements: 2.4, 3.10_
  
  - [x] 8.8 Write property test for confirmed record visual indicators
    - **Property 9: Confirmed Record Visual Indicators**
    - **Validates: Requirements 2.4, 3.9**
  
  - [x] 8.9 Implement double-tap handler
    - Create `handleDoubleTap()` method
    - Set selectedRecord state
    - Set popupVisible to true
    - Determine if record is confirmed (read-only mode)
    - _Requirements: 3.1_
  
  - [x] 8.10 Add navigation to Data Entry Screen
    - Add button to navigate back to data entry screen
    - Use existing navigation patterns
    - _Requirements: 9.3_
  
  - [x] 8.11 Implement delivery statistics display
    - Calculate count of pending records
    - Calculate count of confirmed records
    - Display counts in header or summary section
    - _Requirements: 5.4_
  
  - [x] 8.12 Write property test for statistics accuracy
    - **Property 15: Delivery Statistics Accuracy**
    - **Validates: Requirements 5.4**

- [x] 9. Create Payment Confirmation Popup component
  - [x] 9.1 Create `src/components/PaymentConfirmationPopup.tsx`
    - Set up Modal component
    - Accept props: visible, deliveryRecord, onConfirm, onCancel, readOnly
    - Create state for confirmedAmount, biltyPhoto, signaturePhoto, confirming
    - _Requirements: 3.1, 3.2_
  
  - [x] 9.2 Implement popup UI layout
    - Display delivery record details (billty_no, consignee_name, item_description, original amount)
    - Add amount confirmation section with TextInput
    - Add bilty photo upload section
    - Add signature photo upload section
    - Add confirm and cancel buttons
    - Use existing modal styling patterns
    - _Requirements: 3.2, 3.3, 3.4, 3.5_
  
  - [x] 9.3 Implement photo upload sections
    - Create PhotoUploadSection component
    - Display "Tap to capture" placeholder when no photo
    - Display thumbnail preview when photo captured
    - Add TouchableOpacity to trigger photo capture
    - Show photo type label (Bilty/Signature)
    - _Requirements: 3.4, 3.5, 4.3_
  
  - [x] 9.4 Implement photo capture handler
    - Create `handleCapturePhoto()` method
    - Accept photo type parameter ('bilty' | 'signature')
    - Call PhotoManager.capturePhoto()
    - Show action sheet to choose camera or library
    - Update state with captured photo
    - Display thumbnail preview
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 9.5 Implement confirmation validation
    - Create `validateConfirmation()` method
    - Check confirmedAmount is valid positive number
    - Check biltyPhoto is not null
    - Check signaturePhoto is not null
    - Display warning if photos missing
    - Return validation result
    - _Requirements: 3.6_
  
  - [x] 9.6 Implement handleConfirm method
    - Validate confirmation data
    - Save photos using PhotoManager.savePhoto()
    - Create PaymentConfirmation object
    - Call onConfirm prop with confirmation data
    - Show ActivityIndicator during processing
    - Close popup on success
    - Display error message on failure
    - _Requirements: 3.7_
  
  - [x] 9.7 Implement read-only mode
    - Check readOnly prop
    - Disable all inputs when readOnly is true
    - Hide confirm button, show close button only
    - Display existing photos if available
    - Show "Confirmed" badge or indicator
    - _Requirements: 3.10_

- [x] 10. Integrate components and implement navigation
  - [x] 10.1 Create Mumbai Delivery Navigator
    - Create `src/navigation/MumbaiDeliveryNavigator.tsx`
    - Use createMaterialTopTabNavigator
    - Add DataEntryScreen tab (title: "New Delivery")
    - Add PaymentConfirmationScreen tab (title: "Confirm Payment")
    - Configure tab bar styling to match app theme
    - _Requirements: 9.1_
  
  - [x] 10.2 Update App.tsx navigation
    - Replace MumbaiDeliveryEntryScreen with MumbaiDeliveryNavigator
    - Update navigation types in RootStackParamList
    - Test navigation flow
    - _Requirements: 9.1_
  
  - [x] 10.3 Implement screen state persistence
    - Use React Navigation's state persistence
    - Maintain tab selection when app backgrounded
    - Preserve form data when switching tabs
    - _Requirements: 9.4_

- [x] 11. Checkpoint - Ensure UI components render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement offline support and synchronization
  - [x] 12.1 Extend SyncManager for delivery records
    - Add delivery_records table to sync operations
    - Add delivery_photos table to sync operations
    - Handle INSERT, UPDATE operations for delivery records
    - Handle photo upload operations
    - _Requirements: 6.1, 6.4_
  
  - [x] 12.2 Implement offline save for delivery records
    - Update `saveDeliveryRecord()` to save locally when offline
    - Queue operation for sync using SyncManager
    - Display "Working offline" toast message
    - _Requirements: 6.1_
  
  - [x] 12.3 Implement offline save for photos
    - Update PhotoManager to save photos locally when offline
    - Queue photo upload operation
    - Store photo metadata in AsyncStorage
    - _Requirements: 6.2_
  
  - [x] 12.4 Implement offline confirmation
    - Update `confirmDeliveryPayment()` to work offline
    - Save confirmation data locally
    - Queue sync operation
    - _Requirements: 6.3_
  
  - [x] 12.5 Implement photo upload sync
    - Create photo upload handler in SyncManager
    - Upload photos to Supabase Storage
    - Update photo records with upload_url
    - Implement retry logic for failed uploads
    - Display upload progress/status
    - _Requirements: 4.6, 4.7, 6.5_
  
  - [x] 12.6 Implement sync error handling
    - Display "Sync failed, data saved locally" message
    - Queue failed operations for retry
    - Log sync errors for debugging
    - _Requirements: 6.7, 10.4_
  
  - [x] 12.7 Write property test for office association persistence
    - **Property 5: Office Association Persistence**
    - **Validates: Requirements 1.8, 7.1, 7.5**

- [x] 13. Implement multi-office support
  - [x] 13.1 Integrate OfficeContext in Data Entry Screen
    - Import useOffice hook
    - Get current office_id from context
    - Pass office_id to saveDeliveryRecord
    - _Requirements: 1.8, 7.1_
  
  - [x] 13.2 Integrate OfficeContext in Payment Confirmation Screen
    - Import useOffice hook
    - Get current office_id from context
    - Filter delivery records by office_id
    - Reload data when office changes
    - _Requirements: 7.2, 7.3_
  
  - [x] 13.3 Implement office switching behavior
    - Listen for office context changes
    - Reload delivery records when office changes
    - Clear form data when office changes
    - Display only current office's records
    - _Requirements: 7.3_
  
  - [x] 13.4 Implement office-based access control
    - Ensure all queries include office_id filter
    - Prevent access to other offices' records
    - Validate office_id in all storage functions
    - _Requirements: 7.4_

- [x] 14. Implement data migration for existing records
  - [x] 14.1 Create migration utility function
    - Create `src/utils/migrateExistingMumbaiRecords.ts`
    - Fetch all AgencyEntry records with agency_name='Mumbai'
    - Check if record already has new fields populated
    - _Requirements: 8.1, 8.4_
  
  - [x] 14.2 Implement field mapping logic
    - Map description to item_description
    - Generate placeholder billty_no: `MIGRATED-{id.slice(0,8)}`
    - Set consignee_name to 'Legacy Record'
    - Map delivery_status to confirmation_status
    - Set taken_from_godown and payment_received based on delivery_status
    - _Requirements: 8.2, 8.3_
  
  - [x] 14.3 Write property test for data migration field mapping
    - **Property 13: Data Migration Field Mapping**
    - **Validates: Requirements 8.2, 8.3**
  
  - [x] 14.4 Implement migration execution
    - Update records in batches (50 records per batch)
    - Handle errors gracefully
    - Log migration progress
    - Display migration status to user
    - _Requirements: 8.4_
  
  - [x] 14.5 Add legacy record indicators in UI
    - Check if billty_no starts with 'MIGRATED-'
    - Display badge or indicator for legacy records
    - Show tooltip explaining migrated data
    - _Requirements: 8.5_

- [x] 15. Implement error handling and validation
  - [x] 15.1 Add comprehensive input validation
    - Validate billty_no format (alphanumeric, max length)
    - Validate consignee_name (max length, no special chars)
    - Validate item_description (max length)
    - Validate amount (positive, max value, decimal places)
    - Display field-specific error messages
    - _Requirements: 10.1_
  
  - [x] 15.2 Implement photo validation
    - Validate file type (MIME type check)
    - Validate file size (max 5MB)
    - Display appropriate error messages
    - _Requirements: 4.4_
  
  - [x] 15.3 Add error logging
    - Log all errors to console
    - Include error context (function name, parameters)
    - Log sync errors with operation details
    - _Requirements: 10.7_
  
  - [x] 15.4 Integrate AlertContext for all error messages
    - Use showAlert for all user-facing errors
    - Use consistent error message format
    - Test all error scenarios
    - _Requirements: 10.6_

- [x] 16. Add notification support
  - [x] 16.1 Send notification on new delivery record
    - Call NotificationService.notifyAdd when record saved
    - Include billty_no and amount in notification
    - _Requirements: 1.6_
  
  - [x] 16.2 Send notification on payment confirmation
    - Call NotificationService.notifyAdd when payment confirmed
    - Include billty_no and confirmed amount
    - _Requirements: 3.7_
  
  - [x] 16.3 Send notification on record deletion (if implemented)
    - Call NotificationService.notifyDelete when record deleted
    - Include record details in notification
    - _Requirements: N/A (optional)_

- [x] 17. Final checkpoint and integration testing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Create migration documentation
  - Create `MUMBAI_DELIVERY_MIGRATION_GUIDE.md`
  - Document database schema changes
  - Document API changes
  - Document migration steps for existing data
  - Document new features and usage
  - Include screenshots or diagrams
  - _Requirements: All_

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and integration points
- The implementation maintains backward compatibility with existing AgencyEntry data
- All features support offline-first operation with automatic synchronization
- Multi-office support is integrated throughout the implementation
