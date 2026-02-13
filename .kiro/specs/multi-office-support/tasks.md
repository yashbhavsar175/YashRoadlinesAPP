# Implementation Plan

- [x] 1. Database Schema Setup
  - Create `offices` table with proper structure and indexes
  - Add `office_id` column to `user_profiles` table
  - Add `office_id` column to all transaction tables (agency_payments, agency_majuri, driver_transactions, truck_fuel_entries, general_entries, agency_entries, uppad_jama_entries, cash_records)
  - Create database indexes for performance optimization
  - _Requirements: 1.1, 1.2, 3.1, 9.1_
  - _Status: Migration 009 created and documented_

- [x] 2. Apply Database Migration and Create Default Office





  - Apply migration 009 to Supabase database using dashboard or CLI
  - Insert default office "Prem Darvaja Office" into offices table
  - Verify offices table and all office_id columns exist
  - _Requirements: 9.1, 10.1_

- [x] 3. Database Security and RLS Policies for Transaction Tables





  - Create RLS policies for all transaction tables (agency_payments, agency_majuri, driver_transactions, truck_fuel_entries, general_entries, agency_entries, uppad_jama_entries, cash_records)
  - Policy: Users can only see transactions from their assigned office
  - Policy: Admins can see all transactions from all offices
  - Test RLS policies with different user roles
  - _Requirements: 4.3, 4.5, 8.1, 8.5_

- [x] 4. Data Migration Script







  - Create SQL script to update all existing transactions with default office_id
  - Update all existing user profiles with default office_id
  - Add data integrity verification checks
  - Execute migration script on database
  - _Requirements: 9.2, 9.3, 9.4, 10.2, 10.3_


- [x] 5. Office Data Models and Types





  - Add `Office` interface to Storage.ts
  - Update `UserProfile` interface with office_id and office_name fields
  - Update all transaction interfaces (AgencyPayment, AgencyMajuri, DriverTransaction, TruckFuelEntry, GeneralEntry, etc.) with office_id field
  - Add TypeScript types for office-related operations
  - _Requirements: 1.1, 1.2, 3.1_

- [x] 6. Office Management Functions in Storage Layer






  - Implement `getOffices()` function to fetch all offices
  - Implement `getOfficeById(id)` function
  - Implement `createOffice(name, address)` function with uniqueness validation
  - Implement `updateOffice(id, updates)` function
  - Implement `deleteOffice(id)` function with transaction check
  - Implement `getUserOfficeAssignment(userId)` function
  - Implement `setUserOfficeAssignment(userId, officeId)` function
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 10.1, 10.2, 11.1, 11.2, 11.3, 11.4, 11.5_
-

- [x] 7. Enhance Storage Save Functions




  - Update `saveAgencyPayment()` to accept and include office_id parameter
  - Update `saveAgencyMajuri()` to include office_id
  - Update `saveDriverTransaction()` to include office_id
  - Update `saveTruckFuel()` to include office_id
  - Update `saveGeneralEntry()` to include office_id
  - Update `saveAgencyEntry()` to include office_id
  - Update `saveUppadJamaEntry()` to include office_id
  - Update `saveCashRecord()` to include office_id
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8. Enhance Storage Query Functions





  - Update `getAgencyPayments()` to accept optional officeId parameter and filter results
  - Update `getAgencyMajuri()` to filter by officeId
  - Update `getDriverTransactions()` to filter by officeId
  - Update `getTruckFuelEntries()` to filter by officeId
  - Update `getGeneralEntries()` to filter by officeId
  - Update `getAgencyEntries()` to filter by officeId
  - Update `getUppadJamaEntries()` to filter by officeId
  - Update `getAllTransactionsForDate()` to filter by officeId
  - Update `getCashRecords()` to filter by officeId
  - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 9. Create OfficeContext





  - Create `src/context/OfficeContext.tsx` file
  - Implement OfficeContext with state management for current office
  - Implement `initializeOfficeContext()` to load user's office on app start
  - Implement `switchOffice(officeId)` function with data reload
  - Implement `refreshOffices()` function to reload office list
  - Implement `getCurrentOfficeId()` helper function
  - Add AsyncStorage persistence for selected office
  - Add loading states and error handling
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.5_

- [x] 10. Enhance UserAccessContext





  - Add `assignedOfficeId` field to UserAccessContextType
  - Add `assignedOfficeName` field to UserAccessContextType
  - Add `canAccessMultipleOffices` field (true for admin, false for regular users)
  - Update `refreshPermissions()` to load office assignment from user profile
  - Add logic to determine if user can switch offices
  - _Requirements: 4.1, 4.3, 4.4, 8.1_

- [x] 11. Update App.tsx Navigation





  - Add OfficeContext provider at app root level (wrap around existing providers)
  - Ensure OfficeContext is available to all screens
  - Add navigation route for OfficeManagementScreen
  - Test context availability throughout app
  - _Requirements: 2.1, 2.4_

- [x] 12. Create OfficeSelector Component





  - Create `src/components/OfficeSelector.tsx` file
  - Implement dropdown UI with list of available offices
  - Add "All Offices" option for admin users
  - Implement office selection handler
  - Add visual indicator for current selection
  - Add smooth transition animations
  - Style component to match app theme
  - _Requirements: 2.2, 2.3, 6.1_

- [x] 13. Create OfficeIndicator Component





  - Create `src/components/OfficeIndicator.tsx` file
  - Display current office name
  - Add different styling for admin vs regular users
  - Make clickable for admin (opens OfficeSelector)
  - Make static display for regular users
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 14. Enhance CommonHeader Component





  - Update `src/components/CommonHeader.tsx` to include office indicator
  - Add OfficeSelector dropdown for admin users (next to Name | Role)
  - Add static office display for regular users
  - Implement layout: [Back] Title [Name | Role | Office ▼]
  - Ensure responsive design for different screen sizes
  - _Requirements: 5.1, 5.2, 6.2_

- [x] 15. Enhance HomeScreen





  - Wrap HomeScreen with OfficeContext consumer
  - Update data loading to use current office_id from context
  - Filter majuri dashboard data by current office
  - Filter uppad/jama entries by current office
  - Update UI to show office indicator in header
  - Test office switching and data reload
  - _Requirements: 2.4, 3.2, 3.5, 8.2, 8.3, 8.5_

- [x] 16. Enhance DailyReportScreen




  - Update data queries to filter by current office_id
  - Ensure transactions display only for selected office
  - Update PDF generation to include office information
  - Test with different offices to verify data segregation
  - _Requirements: 3.2, 6.3_

- [x] 17. Enhance AddGeneralEntryScreen





  - Update save function to include current office_id from context
  - Display current office name on entry form
  - Verify entries are tagged with correct office
  - _Requirements: 3.1, 5.3_

- [x] 18. Enhance AgencyPaymentScreen





  - Update data queries to filter by current office_id
  - Update save function to include office_id
  - Test payment creation and filtering
  - _Requirements: 3.1, 3.3_

- [x] 19. Enhance DriverDetailsScreen





  - Update driver transaction queries to filter by office_id
  - Update transaction save to include office_id
  - Verify driver data segregation by office
  - _Requirements: 3.1, 3.4_

- [x] 20. Enhance ManageCashScreen





  - Update cash record queries to filter by office_id
  - Update cash record save to include office_id
  - Ensure cash management is office-specific
  - _Requirements: 3.1, 3.2_

- [x] 21. Enhance UppadJamaScreen





  - Update uppad/jama queries to filter by office_id
  - Update save function to include office_id
  - Test with majur users to ensure proper filtering
  - _Requirements: 3.1, 3.5, 8.3_

- [x] 22. Enhance MonthlyStatementScreen




  - Update monthly data queries to filter by office_id
  - Add office information to monthly reports
  - Test consolidated view for admin (all offices)
  - _Requirements: 3.2, 6.2, 6.4_

- [x] 23. Enhance UserAccessManagementScreen





  - Add office selection dropdown to user creation form
  - Display assigned office name next to user name and role in user list
  - Implement office assignment during user creation
  - Add ability to change user's office assignment
  - Validate that office is selected before creating user
  - _Requirements: 4.1, 4.2, 4.6_
- [x] 24. Create Office Management Screen




- [ ] 24. Create Office Management Screen

  - Create `src/screens/OfficeManagementScreen.tsx` file
  - Display list of all offices with name and address
  - Add "Create Office" button and form
  - Implement office creation with uniqueness validation
  - Add edit functionality for office details
  - Add delete functionality with confirmation and transaction check
  - Add navigation to this screen from admin menu
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 25. Enhance Additional Screens with Office Support




  - Update StatementScreen to filter by office_id
  - Update TotalPaidScreen to filter by office_id
  - Update AddMajuriScreen to include office_id
  - Update AddTruckFuelScreen to include office_id
  - Update MumbaiDeliveryEntryScreen to include office_id (if exists)
  - Update BackdatedEntryScreen to include office_id (if exists)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 26. Implement Offline Sync with Office Support



  - Update offline sync logic to maintain office_id associations
  - Ensure pending operations include office_id
  - Validate office_id before syncing to backend
  - Add conflict resolution for office mismatches
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 27. Add Office Information to PDF Reports





  - Update PDF generation functions to include office name
  - Add office header to daily reports
  - Add office breakdown to consolidated reports
  - Test PDF generation for different offices
  - _Requirements: 6.3, 6.5_

- [x] 28. Integration Testing




  - Test complete user flow: login → see assigned office → create transaction → verify office_id
  - Test admin flow: login → switch office → verify data changes → create transaction → verify office_id
  - Test office creation and user assignment flow
  - Test data segregation: create data in Office A, switch to Office B, verify Office A data not visible
  - Test "All Offices" view for admin
  - Test non-admin user cannot access other office data
  - Test migration: verify existing data assigned to default office
  - Test offline sync maintains office associations
  - _Requirements: All requirements_

- [x] 29. Performance Optimization





  - Monitor query performance with office_id filters
  - Optimize database indexes if needed
  - Implement caching strategy for office list
  - Add debouncing to office switcher
  - Profile app performance with multiple offices
  - _Requirements: 2.3, 5.5, 7.5_

- [-] 30. Documentation


  - Document office management workflow for admin users
  - Create user guide for office switching
  - Document database schema changes
  - Add code comments for office-related functions
  - Update README with multi-office feature description
  - _Requirements: All requirements_

