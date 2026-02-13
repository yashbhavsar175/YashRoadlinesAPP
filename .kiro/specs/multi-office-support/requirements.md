# Requirements Document

## Introduction

This feature enables the application to support multiple office locations (e.g., "Prem Darvaja Office" and "Aslali Office") within a single system. Users will be able to switch between offices, and all data (transactions, reports, entries) will be segregated by office. This allows the business to manage multiple office locations independently while using the same application.

## Glossary

- **System**: The YashRoadlines mobile application
- **Office**: A physical business location (e.g., "Prem Darvaja Office", "Aslali Office")
- **User**: Any authenticated person using the application
- **Admin**: A user with administrative privileges who can manage offices and users
- **Office Context**: The currently selected office that determines which data is displayed
- **Office Switcher**: UI component that allows users to change the active office
- **Transaction**: Any financial entry (payment, majuri, fuel, general entry, etc.)
- **Segregated Data**: Data that is filtered and stored per office

## Requirements

### Requirement 1

**User Story:** As an admin, I want to create and manage multiple offices in the system, so that I can track each location's operations separately.

#### Acceptance Criteria

1. WHEN the Admin accesses the office management screen, THE System SHALL display a list of all existing offices
2. WHEN the Admin creates a new office, THE System SHALL save the office with a unique identifier, name, and optional address
3. WHEN the Admin edits an office, THE System SHALL update the office details and reflect changes immediately
4. WHEN the Admin deletes an office, THE System SHALL prompt for confirmation before deletion
5. IF an office has associated transactions, THEN THE System SHALL prevent deletion and display an error message

### Requirement 2

**User Story:** As a user, I want to select which office I'm working with, so that I can view and manage data specific to that location.

#### Acceptance Criteria

1. WHEN the User logs in, THE System SHALL display the last selected office as the active office
2. WHEN the User opens the office switcher, THE System SHALL display all available offices
3. WHEN the User selects a different office, THE System SHALL update the active office context within 2 seconds
4. WHEN the office context changes, THE System SHALL reload all screens to display data for the selected office
5. THE System SHALL persist the selected office preference locally for the user

### Requirement 3

**User Story:** As a user, I want all my transactions and entries to be automatically associated with the currently selected office, so that data remains organized by location.

#### Acceptance Criteria

1. WHEN the User creates any transaction, THE System SHALL automatically tag it with the current office identifier
2. WHEN the User views the daily report, THE System SHALL display only transactions for the currently selected office
3. WHEN the User views agency payments, THE System SHALL filter results by the current office
4. WHEN the User views driver transactions, THE System SHALL show only entries for the current office
5. WHEN the User views majuri entries, THE System SHALL display only majuri data for the selected office

### Requirement 4

**User Story:** As an admin, I want to assign users to specific offices during user creation, so that I can control which locations each user can access from the start.

#### Acceptance Criteria

1. WHEN the Admin creates a new user, THE System SHALL display an office selection dropdown in the user creation form
2. WHEN the Admin selects an office for a user, THE System SHALL assign that user exclusively to the selected office
3. WHEN a User logs in, THE System SHALL display only their assigned office data
4. IF a User is assigned to only one office, THEN THE System SHALL automatically select that office and hide the office switcher
5. WHEN the Admin removes office access from a user, THE System SHALL prevent that user from accessing the office's data
6. WHEN the Admin views user management, THE System SHALL display the assigned office name next to each user's name and role

### Requirement 5

**User Story:** As a user, I want to see which office I'm currently working with at all times, so that I don't accidentally enter data for the wrong location.

#### Acceptance Criteria

1. THE System SHALL display the current office name in the app header on all screens
2. WHEN the User navigates between screens, THE System SHALL maintain the office indicator visibility
3. WHEN the User creates a new entry, THE System SHALL display the current office name on the entry form
4. THE System SHALL use distinct visual styling for the office indicator to ensure visibility
5. WHEN the office context changes, THE System SHALL update the office indicator within 1 second

### Requirement 6

**User Story:** As an admin, I want to view data for any office using a dropdown selector, so that I can monitor and manage all locations from a single interface.

#### Acceptance Criteria

1. WHEN the Admin views any screen, THE System SHALL display an office dropdown next to the user name and role in the header
2. WHEN the Admin selects an office from the dropdown, THE System SHALL reload the current screen with data for the selected office within 2 seconds
3. WHEN the Admin selects "All Offices" option, THE System SHALL aggregate data from all offices
4. WHEN viewing consolidated reports, THE System SHALL display office-wise breakdowns
5. WHEN generating PDF reports, THE System SHALL include office information for each transaction
6. THE System SHALL calculate separate totals for each office in consolidated view
7. THE System SHALL persist the admin's last selected office preference

### Requirement 7

**User Story:** As a developer, I want the office data to be properly synchronized with the backend, so that data remains consistent across devices.

#### Acceptance Criteria

1. WHEN the System syncs data, THE System SHALL include office identifiers in all API requests
2. WHEN the System receives data from the backend, THE System SHALL validate office associations
3. IF a sync conflict occurs, THEN THE System SHALL prioritize server data and log the conflict
4. WHEN offline changes are synced, THE System SHALL maintain office associations
5. THE System SHALL sync office list changes within 5 seconds of modification

### Requirement 8

**User Story:** As a non-admin user, I want to see only my assigned office's data without any option to switch offices, so that I remain focused on my designated location.

#### Acceptance Criteria

1. WHEN a non-admin User logs in, THE System SHALL automatically load their assigned office
2. THE System SHALL hide the office switcher dropdown for non-admin users
3. WHEN a non-admin User views any screen, THE System SHALL display only data from their assigned office
4. THE System SHALL display the assigned office name in the header for reference
5. IF a non-admin User attempts to access another office's data, THEN THE System SHALL deny access and display an error message

### Requirement 9

**User Story:** As a majur user, I want my dashboard to show data only from the office I'm assigned to, so that I see relevant information for my work location.

#### Acceptance Criteria

1. WHEN a Majur User logs in, THE System SHALL display only their assigned office's data
2. WHEN viewing majuri entries, THE System SHALL filter by the current office
3. WHEN viewing uppad/jama entries, THE System SHALL show only entries for the assigned office
4. IF a Majur User is assigned to multiple offices, THEN THE System SHALL allow office switching
5. THE System SHALL display the current office name on the majur dashboard

### Requirement 10

**User Story:** As a user, I want existing data to be automatically migrated to the default office, so that I don't lose any historical information when the multi-office feature is enabled.

#### Acceptance Criteria

1. WHEN the multi-office feature is first enabled, THE System SHALL create a default office named "Prem Darvaja Office"
2. WHEN migrating existing data, THE System SHALL associate all existing transactions with the default office
3. WHEN migration completes, THE System SHALL verify that all records have office associations
4. IF migration fails for any record, THEN THE System SHALL log the error and continue with remaining records
5. THE System SHALL complete migration within 30 seconds for up to 10,000 records

### Requirement 11

**User Story:** As an admin, I want to ensure that office names are unique, so that there is no confusion when selecting or managing offices.

#### Acceptance Criteria

1. WHEN the Admin creates a new office, THE System SHALL validate that the office name is unique
2. IF a duplicate office name is entered, THEN THE System SHALL display an error message and prevent creation
3. WHEN the Admin edits an office name, THE System SHALL check for uniqueness excluding the current office
4. THE System SHALL perform case-insensitive comparison for office name uniqueness
5. THE System SHALL trim whitespace from office names before validation
