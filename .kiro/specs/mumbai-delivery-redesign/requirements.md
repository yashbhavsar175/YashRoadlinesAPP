# Requirements Document

## Introduction

The Mumbai Delivery feature redesign transforms the current single-screen delivery entry system into a comprehensive two-screen workflow that supports data entry, payment confirmation, and proof documentation. This redesign enables delivery personnel to efficiently manage the complete delivery lifecycle from initial entry through payment confirmation with photographic proof.

## Glossary

- **System**: The Mumbai Delivery mobile application component
- **Delivery_Record**: A single delivery entry containing billty number, consignee information, item description, and amount
- **Billty_No**: Unique identifier for a delivery shipment (also spelled "Bilty")
- **Consignee**: The recipient of the delivered goods
- **Payment_Confirmation**: The process of verifying that payment has been received from the consignee
- **Proof_Photo**: Digital photograph of bilty document or signature as evidence of delivery
- **Godown**: Warehouse or storage facility where items are kept before delivery
- **Confirmed_Item**: A delivery record that has been marked as delivered with payment received
- **Data_Entry_Screen**: Screen 1 where delivery records are initially created
- **Payment_Confirmation_Screen**: Screen 2 where delivery records are confirmed with payment and proof

## Requirements

### Requirement 1: Data Entry Screen

**User Story:** As a delivery personnel, I want to enter delivery information quickly, so that I can record all deliveries that need to be made.

#### Acceptance Criteria

1. THE System SHALL display four text input fields: Billty No, Consignee Name, Item Description, and Amount
2. WHEN a user enters data in all required fields, THE System SHALL enable the save action
3. WHEN a user saves a delivery record, THE System SHALL validate that Billty No is not empty
4. WHEN a user saves a delivery record, THE System SHALL validate that Consignee Name is not empty
5. WHEN a user saves a delivery record, THE System SHALL validate that Amount is a positive number
6. WHEN a user saves a valid delivery record, THE System SHALL store it with status "pending confirmation"
7. WHEN a delivery record is saved, THE System SHALL clear all input fields for the next entry
8. WHEN a delivery record is saved, THE System SHALL associate it with the current office context

### Requirement 2: Payment Confirmation Screen Display

**User Story:** As a delivery personnel, I want to view all pending deliveries in a list, so that I can track which deliveries need payment confirmation.

#### Acceptance Criteria

1. THE System SHALL display delivery records in a table format with columns: Index No, Billty No, Consignee Name, Item Description, Amount
2. WHEN displaying delivery records, THE System SHALL show pending records above confirmed records
3. WHEN displaying delivery records, THE System SHALL separate confirmed records with a green line separator
4. WHEN displaying confirmed records, THE System SHALL show a checkmark indicator next to each confirmed item
5. THE System SHALL display the Index No as a sequential number starting from 1
6. WHEN the Payment_Confirmation_Screen loads, THE System SHALL fetch all delivery records for the current office

### Requirement 3: Payment Confirmation Interaction

**User Story:** As a delivery personnel, I want to confirm payment by double-tapping a delivery record, so that I can mark deliveries as complete with proof.

#### Acceptance Criteria

1. WHEN a user double-taps on a pending delivery record, THE System SHALL open a payment confirmation popup
2. THE Payment_Confirmation_Popup SHALL display the delivery record details
3. THE Payment_Confirmation_Popup SHALL include an amount confirmation section
4. THE Payment_Confirmation_Popup SHALL include a photo upload section for bilty proof
5. THE Payment_Confirmation_Popup SHALL include a photo upload section for signature proof
6. WHEN a user confirms payment without uploading photos, THE System SHALL display a warning message
7. WHEN a user confirms payment with all required information, THE System SHALL mark the record as confirmed
8. WHEN a record is marked as confirmed, THE System SHALL move it below the green line separator
9. WHEN a record is marked as confirmed, THE System SHALL display a checkmark indicator
10. WHEN a user double-taps on a confirmed record, THE System SHALL display the confirmation details in read-only mode

### Requirement 4: Photo Capture and Upload

**User Story:** As a delivery personnel, I want to capture photos of bilty and signature, so that I have proof of delivery and payment.

#### Acceptance Criteria

1. WHEN a user taps the bilty photo section, THE System SHALL open the device camera or photo library
2. WHEN a user taps the signature photo section, THE System SHALL open the device camera or photo library
3. WHEN a photo is captured, THE System SHALL display a thumbnail preview in the popup
4. WHEN a photo is selected, THE System SHALL validate that the file is an image format
5. THE System SHALL store photos with the delivery record in offline storage
6. WHEN online, THE System SHALL sync photos to the backend storage
7. WHEN a photo upload fails, THE System SHALL queue it for retry when connection is restored

### Requirement 5: Delivery Status Tracking

**User Story:** As a delivery personnel, I want to see which items have been taken from the godown and paid for, so that I can track my delivery progress.

#### Acceptance Criteria

1. WHEN a delivery record is confirmed, THE System SHALL mark it as "taken from godown"
2. WHEN a delivery record is confirmed, THE System SHALL mark it as "payment received"
3. THE System SHALL display confirmed records with both status indicators visible
4. WHEN displaying delivery statistics, THE System SHALL show count of pending vs confirmed deliveries
5. THE System SHALL persist delivery status across app restarts

### Requirement 6: Offline Support and Synchronization

**User Story:** As a delivery personnel, I want to work offline during deliveries, so that I can continue working without internet connectivity.

#### Acceptance Criteria

1. WHEN offline, THE System SHALL save all delivery records to local storage
2. WHEN offline, THE System SHALL save all photos to local storage
3. WHEN offline, THE System SHALL save all confirmation actions to local storage
4. WHEN connection is restored, THE System SHALL sync pending delivery records to the backend
5. WHEN connection is restored, THE System SHALL sync pending photos to the backend
6. WHEN connection is restored, THE System SHALL sync pending confirmation actions to the backend
7. WHEN sync fails, THE System SHALL queue operations for retry
8. THE System SHALL maintain data consistency between local and remote storage

### Requirement 7: Multi-Office Support

**User Story:** As a system administrator, I want delivery records to be associated with specific offices, so that each office can manage their own deliveries independently.

#### Acceptance Criteria

1. WHEN a delivery record is created, THE System SHALL associate it with the current active office
2. WHEN displaying delivery records, THE System SHALL filter by the current active office
3. WHEN a user switches offices, THE System SHALL display only that office's delivery records
4. THE System SHALL prevent access to delivery records from other offices
5. WHEN syncing data, THE System SHALL maintain office associations correctly

### Requirement 8: Data Migration and Backward Compatibility

**User Story:** As a system administrator, I want existing Mumbai delivery entries to be preserved, so that historical data is not lost during the redesign.

#### Acceptance Criteria

1. THE System SHALL maintain compatibility with existing AgencyEntry data structure
2. WHEN migrating existing data, THE System SHALL map description field to item description
3. WHEN migrating existing data, THE System SHALL generate placeholder values for missing fields
4. THE System SHALL preserve all existing delivery records with agency_name='Mumbai'
5. WHEN displaying legacy records, THE System SHALL indicate which fields are from migrated data

### Requirement 9: Navigation and User Interface

**User Story:** As a delivery personnel, I want to navigate easily between data entry and confirmation screens, so that I can efficiently manage my workflow.

#### Acceptance Criteria

1. THE System SHALL provide a navigation control to switch between Data_Entry_Screen and Payment_Confirmation_Screen
2. WHEN on Data_Entry_Screen, THE System SHALL provide a button to navigate to Payment_Confirmation_Screen
3. WHEN on Payment_Confirmation_Screen, THE System SHALL provide a button to navigate to Data_Entry_Screen
4. THE System SHALL maintain the current screen state when the app is backgrounded
5. THE System SHALL follow the existing app's design system and color scheme
6. THE System SHALL use gesture handlers for double-tap interactions
7. THE System SHALL provide visual feedback for all user interactions

### Requirement 10: Validation and Error Handling

**User Story:** As a delivery personnel, I want clear error messages when something goes wrong, so that I can correct issues quickly.

#### Acceptance Criteria

1. WHEN a required field is empty, THE System SHALL display a field-specific error message
2. WHEN an amount is invalid, THE System SHALL display "Enter valid amount"
3. WHEN a photo upload fails, THE System SHALL display "Photo upload failed, will retry"
4. WHEN sync fails, THE System SHALL display "Sync failed, data saved locally"
5. WHEN a duplicate Billty No is entered, THE System SHALL display a warning message
6. THE System SHALL use the existing AlertContext for displaying error messages
7. THE System SHALL log all errors for debugging purposes
