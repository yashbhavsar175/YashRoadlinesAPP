/**
 * Property-Based Tests for Office-Based Record Filtering
 * Feature: mumbai-delivery-redesign
 * 
 * Property 12: Office-Based Record Filtering
 * Validates: Requirements 7.2, 7.4
 * 
 * For any query for delivery records with a specified office_id, the returned results 
 * should contain only records where the record's office_id matches the query parameter, 
 * and no records from other offices should be included.
 */

import * as fc from 'fast-check';
import * as Storage from '../src/data/Storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock console.error to avoid cluttering test output
let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  // Reset AsyncStorage mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('Property 12: Office-Based Record Filtering', () => {
  /**
   * **Validates: Requirements 7.2, 7.4**
   * 
   * This property verifies that getDeliveryRecords properly filters records by office_id
   * and returns only records matching the specified office, with no records from other offices.
   */

  test('Property 12.1: Filtering by office_id should return only records from that office', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // Target office ID
        fc.uuid(), // Other office ID
        fc.integer({ min: 1, max: 3 }), // Number of records per office
        async (targetOfficeId, otherOfficeId) => {
          // Skip if IDs are the same
          fc.pre(targetOfficeId !== otherOfficeId);
          
          const recordCount = 2;
          
          // Create simple test records
          const targetRecords = Array.from({ length: recordCount }, (_, i) => ({
            id: `target-${i}`,
            billty_no: `BT-${i}`,
            consignee_name: `Consignee ${i}`,
            item_description: `Item ${i}`,
            description: `Item ${i}`,
            amount: 100 + i,
            office_id: targetOfficeId,
            agency_id: 'agency-1',
            agency_name: 'Mumbai',
            entry_type: 'debit' as const,
            confirmation_status: 'pending' as const,
            entry_date: new Date().toISOString(),
            taken_from_godown: false,
            payment_received: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
          
          const otherRecords = Array.from({ length: recordCount }, (_, i) => ({
            id: `other-${i}`,
            billty_no: `BT-O-${i}`,
            consignee_name: `Other ${i}`,
            item_description: `Other Item ${i}`,
            description: `Other Item ${i}`,
            amount: 200 + i,
            office_id: otherOfficeId,
            agency_id: 'agency-1',
            agency_name: 'Mumbai',
            entry_type: 'debit' as const,
            confirmation_status: 'pending' as const,
            entry_date: new Date().toISOString(),
            taken_from_godown: false,
            payment_received: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
          
          const allRecords = [...targetRecords, ...otherRecords];
          
          // Mock AsyncStorage.getItem to return our test data
          (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(allRecords));
          
          // Act: Query for target office records
          const result = await Storage.getDeliveryRecords(targetOfficeId);
          
          // Assert: All returned records should have the target office_id
          expect(result.length).toBe(targetRecords.length);
          for (const record of result) {
            expect(record.office_id).toBe(targetOfficeId);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 12.2: Filtering should exclude records with null or undefined office_id', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // Target office ID
        async (targetOfficeId) => {
          const targetRecord = {
            id: 'target-1',
            billty_no: 'BT-1',
            consignee_name: 'Consignee 1',
            item_description: 'Item 1',
            description: 'Item 1',
            amount: 100,
            office_id: targetOfficeId,
            agency_id: 'agency-1',
            agency_name: 'Mumbai',
            entry_type: 'debit' as const,
            confirmation_status: 'pending' as const,
            entry_date: new Date().toISOString(),
            taken_from_godown: false,
            payment_received: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          const nullRecord = {
            id: 'null-1',
            billty_no: 'BT-N-1',
            consignee_name: 'Null Consignee',
            item_description: 'Null Item',
            description: 'Null Item',
            amount: 200,
            office_id: undefined,
            agency_id: 'agency-1',
            agency_name: 'Mumbai',
            entry_type: 'debit' as const,
            confirmation_status: 'pending' as const,
            entry_date: new Date().toISOString(),
            taken_from_godown: false,
            payment_received: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          const allRecords = [targetRecord, nullRecord];
          
          // Mock AsyncStorage.getItem to return our test data
          (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(allRecords));
          
          // Act: Query for target office records
          const result = await Storage.getDeliveryRecords(targetOfficeId);
          
          // Assert: Only records with target office_id should be returned
          expect(result.length).toBe(1);
          expect(result[0].office_id).toBe(targetOfficeId);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 12.3: Filtering should work with empty result set', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // Target office ID
        fc.uuid(), // Other office ID
        async (targetOfficeId, otherOfficeId) => {
          // Skip if IDs are the same
          fc.pre(targetOfficeId !== otherOfficeId);
          
          const otherRecord = {
            id: 'other-1',
            billty_no: 'BT-O-1',
            consignee_name: 'Other Consignee',
            item_description: 'Other Item',
            description: 'Other Item',
            amount: 200,
            office_id: otherOfficeId,
            agency_id: 'agency-1',
            agency_name: 'Mumbai',
            entry_type: 'debit' as const,
            confirmation_status: 'pending' as const,
            entry_date: new Date().toISOString(),
            taken_from_godown: false,
            payment_received: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          // Mock AsyncStorage.getItem to return only other office records
          (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([otherRecord]));
          
          // Act: Query for target office records (should be empty)
          const result = await Storage.getDeliveryRecords(targetOfficeId);
          
          // Assert: Result should be empty
          expect(result.length).toBe(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 12.4: Filtering should work with status filter combination', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // Target office ID
        fc.uuid(), // Other office ID
        fc.constantFrom('pending', 'confirmed') as fc.Arbitrary<'pending' | 'confirmed'>,
        async (targetOfficeId, otherOfficeId, statusFilter) => {
          // Skip if IDs are the same
          fc.pre(targetOfficeId !== otherOfficeId);
          
          const targetPending = {
            id: 'target-pending',
            billty_no: 'BT-P',
            consignee_name: 'Pending',
            item_description: 'Pending Item',
            description: 'Pending Item',
            amount: 100,
            office_id: targetOfficeId,
            agency_id: 'agency-1',
            agency_name: 'Mumbai',
            entry_type: 'debit' as const,
            confirmation_status: 'pending' as const,
            entry_date: new Date().toISOString(),
            taken_from_godown: false,
            payment_received: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          const targetConfirmed = {
            id: 'target-confirmed',
            billty_no: 'BT-C',
            consignee_name: 'Confirmed',
            item_description: 'Confirmed Item',
            description: 'Confirmed Item',
            amount: 150,
            office_id: targetOfficeId,
            agency_id: 'agency-1',
            agency_name: 'Mumbai',
            entry_type: 'debit' as const,
            confirmation_status: 'confirmed' as const,
            entry_date: new Date().toISOString(),
            taken_from_godown: true,
            payment_received: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          const otherRecord = {
            id: 'other-1',
            billty_no: 'BT-O',
            consignee_name: 'Other',
            item_description: 'Other Item',
            description: 'Other Item',
            amount: 200,
            office_id: otherOfficeId,
            agency_id: 'agency-1',
            agency_name: 'Mumbai',
            entry_type: 'debit' as const,
            confirmation_status: statusFilter,
            entry_date: new Date().toISOString(),
            taken_from_godown: false,
            payment_received: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          const allRecords = [targetPending, targetConfirmed, otherRecord];
          
          // Mock AsyncStorage.getItem to return our test data
          (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(allRecords));
          
          // Act: Query for target office records with status filter
          const result = await Storage.getDeliveryRecords(targetOfficeId, statusFilter);
          
          // Assert: All returned records should have the target office_id and matching status
          expect(result.length).toBe(1);
          for (const record of result) {
            expect(record.office_id).toBe(targetOfficeId);
            expect(record.confirmation_status).toBe(statusFilter);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 12.5: Filtering without office_id parameter should return all Mumbai records', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // Office ID 1
        fc.uuid(), // Office ID 2
        async (officeId1, officeId2) => {
          // Skip if IDs are the same
          fc.pre(officeId1 !== officeId2);
          
          const record1 = {
            id: 'record-1',
            billty_no: 'BT-1',
            consignee_name: 'Consignee 1',
            item_description: 'Item 1',
            description: 'Item 1',
            amount: 100,
            office_id: officeId1,
            agency_id: 'agency-1',
            agency_name: 'Mumbai',
            entry_type: 'debit' as const,
            confirmation_status: 'pending' as const,
            entry_date: new Date().toISOString(),
            taken_from_godown: false,
            payment_received: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          const record2 = {
            id: 'record-2',
            billty_no: 'BT-2',
            consignee_name: 'Consignee 2',
            item_description: 'Item 2',
            description: 'Item 2',
            amount: 200,
            office_id: officeId2,
            agency_id: 'agency-1',
            agency_name: 'Mumbai',
            entry_type: 'debit' as const,
            confirmation_status: 'pending' as const,
            entry_date: new Date().toISOString(),
            taken_from_godown: false,
            payment_received: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          const allRecords = [record1, record2];
          
          // Mock AsyncStorage.getItem to return our test data
          (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(allRecords));
          
          // Act: Query without office_id filter
          const result = await Storage.getDeliveryRecords();
          
          // Assert: All Mumbai records should be returned
          expect(result.length).toBe(2);
          for (const record of result) {
            expect(record.agency_name).toBe('Mumbai');
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

