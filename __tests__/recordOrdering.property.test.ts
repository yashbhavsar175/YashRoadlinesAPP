/**
 * Property-Based Tests for Record Display Ordering
 * Feature: mumbai-delivery-redesign
 * 
 * Property 6: Record Display Ordering
 * Validates: Requirements 2.2, 3.8
 * 
 * For any list of delivery records, pending records should appear before confirmed records,
 * and within each group, records should be ordered by entry_date descending.
 * 
 * Note: These tests verify the ordering logic by generating random sets of delivery records
 * with various confirmation statuses and entry dates, then verifying the returned order.
 */

import * as fc from 'fast-check';
import * as Storage from '../src/data/Storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock console.error to avoid cluttering test output
let consoleErrorSpy: jest.SpyInstance;

// Create a real in-memory storage for AsyncStorage
const mockStorage: Record<string, string> = {};

beforeEach(async () => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  
  // Clear mock storage
  Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  
  // Mock AsyncStorage with actual storage behavior
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  });
  
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
    return Promise.resolve(mockStorage[key] || null);
  });
  
  (AsyncStorage.clear as jest.Mock).mockImplementation(async () => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    return Promise.resolve();
  });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('Property 6: Record Display Ordering', () => {
  /**
   * **Validates: Requirements 2.2, 3.8**
   * 
   * This property verifies that getDeliveryRecords returns records in the correct order:
   * - Pending records appear before confirmed records
   * - Within each group (pending/confirmed), records are ordered by entry_date descending
   */

  // Arbitrary for generating valid delivery record data
  const validStringArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
  const validAmountArb = fc.float({ min: Math.fround(0.1), max: Math.fround(1000000), noNaN: true, noDefaultInfinity: true }).filter(a => a > 0);
  
  // Arbitrary for generating a date within a reasonable range (last 365 days)
  const recentDateArb = fc.date({ 
    min: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    max: new Date()
  });

  // Arbitrary for generating a delivery record with specific confirmation status
  const deliveryRecordWithStatusArb = (status: 'pending' | 'confirmed') => fc.record({
    id: fc.uuid(),
    billty_no: validStringArb,
    consignee_name: validStringArb,
    item_description: validStringArb,
    amount: validAmountArb,
    confirmation_status: fc.constant(status),
    entry_date: recentDateArb,
    agency_name: fc.constant('Mumbai'),
    agency_id: fc.uuid(),
    description: validStringArb,
    entry_type: fc.constantFrom('credit' as const, 'debit' as const),
    created_at: recentDateArb,
    updated_at: recentDateArb,
    taken_from_godown: fc.constant(status === 'confirmed'),
    payment_received: fc.constant(status === 'confirmed'),
  });

  // Arbitrary for generating a list of mixed pending and confirmed records
  const mixedRecordsArb = fc.tuple(
    fc.array(deliveryRecordWithStatusArb('pending'), { minLength: 1, maxLength: 10 }),
    fc.array(deliveryRecordWithStatusArb('confirmed'), { minLength: 1, maxLength: 10 })
  ).map(([pending, confirmed]) => [...pending, ...confirmed]);

  test('Property 6.1: Pending records should appear before confirmed records', async () => {
    await fc.assert(
      fc.asyncProperty(
        mixedRecordsArb,
        async (records) => {
          // Arrange - Save records to AsyncStorage in random order
          const shuffled = [...records].sort(() => Math.random() - 0.5);
          await AsyncStorage.setItem('offline_delivery_records', JSON.stringify(shuffled));

          // Act - Fetch records (will use offline storage)
          const result = await Storage.getDeliveryRecords();

          // Assert - Find the last pending and first confirmed record
          const lastPendingIndex = result.map(r => r.confirmation_status).lastIndexOf('pending');
          const firstConfirmedIndex = result.findIndex(r => r.confirmation_status === 'confirmed');

          // If both types exist, pending should come before confirmed
          if (lastPendingIndex !== -1 && firstConfirmedIndex !== -1) {
            expect(lastPendingIndex).toBeLessThan(firstConfirmedIndex);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 6.2: Within pending records, entry_date should be descending', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(deliveryRecordWithStatusArb('pending'), { minLength: 2, maxLength: 10 }),
        async (records) => {
          // Arrange - Save records to AsyncStorage in random order
          const shuffled = [...records].sort(() => Math.random() - 0.5);
          await AsyncStorage.setItem('offline_delivery_records', JSON.stringify(shuffled));

          // Act - Fetch records
          const result = await Storage.getDeliveryRecords();

          // Assert - Check that pending records are in descending order by entry_date
          const pendingRecords = result.filter(r => r.confirmation_status === 'pending');
          
          for (let i = 0; i < pendingRecords.length - 1; i++) {
            const currentDate = new Date(pendingRecords[i].entry_date).getTime();
            const nextDate = new Date(pendingRecords[i + 1].entry_date).getTime();
            expect(currentDate).toBeGreaterThanOrEqual(nextDate);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 6.3: Within confirmed records, entry_date should be descending', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(deliveryRecordWithStatusArb('confirmed'), { minLength: 2, maxLength: 10 }),
        async (records) => {
          // Arrange - Save records to AsyncStorage in random order
          const shuffled = [...records].sort(() => Math.random() - 0.5);
          await AsyncStorage.setItem('offline_delivery_records', JSON.stringify(shuffled));

          // Act - Fetch records
          const result = await Storage.getDeliveryRecords();

          // Assert - Check that confirmed records are in descending order by entry_date
          const confirmedRecords = result.filter(r => r.confirmation_status === 'confirmed');
          
          for (let i = 0; i < confirmedRecords.length - 1; i++) {
            const currentDate = new Date(confirmedRecords[i].entry_date).getTime();
            const nextDate = new Date(confirmedRecords[i + 1].entry_date).getTime();
            expect(currentDate).toBeGreaterThanOrEqual(nextDate);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 6.4: Complete ordering - pending before confirmed, each group by date descending', async () => {
    await fc.assert(
      fc.asyncProperty(
        mixedRecordsArb,
        async (records) => {
          // Arrange - Save records to AsyncStorage in random order
          const shuffled = [...records].sort(() => Math.random() - 0.5);
          await AsyncStorage.setItem('offline_delivery_records', JSON.stringify(shuffled));

          // Act - Fetch records
          const result = await Storage.getDeliveryRecords();

          // Assert - Verify complete ordering
          let seenConfirmed = false;
          let lastPendingDate: number | null = null;
          let lastConfirmedDate: number | null = null;

          for (const record of result) {
            const currentDate = new Date(record.entry_date).getTime();

            if (record.confirmation_status === 'pending') {
              // Should not see pending after confirmed
              expect(seenConfirmed).toBe(false);
              
              // Check descending order within pending
              if (lastPendingDate !== null) {
                expect(lastPendingDate).toBeGreaterThanOrEqual(currentDate);
              }
              lastPendingDate = currentDate;
            } else if (record.confirmation_status === 'confirmed') {
              seenConfirmed = true;
              
              // Check descending order within confirmed
              if (lastConfirmedDate !== null) {
                expect(lastConfirmedDate).toBeGreaterThanOrEqual(currentDate);
              }
              lastConfirmedDate = currentDate;
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 6.5: Ordering should be consistent across multiple calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        mixedRecordsArb,
        async (records) => {
          // Arrange - Save records to AsyncStorage
          await AsyncStorage.setItem('offline_delivery_records', JSON.stringify(records));

          // Act - Fetch records multiple times
          const result1 = await Storage.getDeliveryRecords();
          const result2 = await Storage.getDeliveryRecords();

          // Assert - Results should be identical
          expect(result1.length).toBe(result2.length);
          
          for (let i = 0; i < result1.length; i++) {
            expect(result1[i].id).toBe(result2[i].id);
            expect(result1[i].confirmation_status).toBe(result2[i].confirmation_status);
            expect(result1[i].entry_date).toBe(result2[i].entry_date);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 6.6: Ordering should work with records having identical entry_dates', async () => {
    await fc.assert(
      fc.asyncProperty(
        recentDateArb,
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 2, max: 5 }),
        async (sharedDate, numPending, numConfirmed) => {
          // Arrange - Create records with identical dates within each group
          const pendingRecords = Array.from({ length: numPending }, (_, i) => ({
            id: `pending-${i}`,
            billty_no: `BILL-P-${i}`,
            consignee_name: `Consignee P${i}`,
            item_description: `Item P${i}`,
            amount: 100 + i,
            confirmation_status: 'pending' as const,
            entry_date: sharedDate.toISOString(),
            agency_name: 'Mumbai',
            agency_id: 'test-agency',
            description: `Desc P${i}`,
            entry_type: 'credit' as const,
            created_at: sharedDate.toISOString(),
            updated_at: sharedDate.toISOString(),
            taken_from_godown: false,
            payment_received: false,
          }));

          const confirmedRecords = Array.from({ length: numConfirmed }, (_, i) => ({
            id: `confirmed-${i}`,
            billty_no: `BILL-C-${i}`,
            consignee_name: `Consignee C${i}`,
            item_description: `Item C${i}`,
            amount: 200 + i,
            confirmation_status: 'confirmed' as const,
            entry_date: sharedDate.toISOString(),
            agency_name: 'Mumbai',
            agency_id: 'test-agency',
            description: `Desc C${i}`,
            entry_type: 'credit' as const,
            created_at: sharedDate.toISOString(),
            updated_at: sharedDate.toISOString(),
            taken_from_godown: true,
            payment_received: true,
          }));

          const allRecords = [...pendingRecords, ...confirmedRecords];
          const shuffled = [...allRecords].sort(() => Math.random() - 0.5);
          
          await AsyncStorage.setItem('offline_delivery_records', JSON.stringify(shuffled));

          // Act
          const result = await Storage.getDeliveryRecords();

          // Assert - All pending should come before all confirmed
          const resultPending = result.filter(r => r.confirmation_status === 'pending');
          const resultConfirmed = result.filter(r => r.confirmation_status === 'confirmed');
          
          // The result should contain all our records (they all have agency_name='Mumbai')
          expect(result.length).toBe(numPending + numConfirmed);
          expect(resultPending.length).toBe(numPending);
          expect(resultConfirmed.length).toBe(numConfirmed);
          
          // Verify pending comes before confirmed
          const lastPendingIndex = result.map(r => r.confirmation_status).lastIndexOf('pending');
          const firstConfirmedIndex = result.findIndex(r => r.confirmation_status === 'confirmed');
          
          if (lastPendingIndex !== -1 && firstConfirmedIndex !== -1) {
            expect(lastPendingIndex).toBeLessThan(firstConfirmedIndex);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 6.7: Ordering should handle empty result sets gracefully', async () => {
    // Arrange - Empty storage
    await AsyncStorage.setItem('offline_delivery_records', JSON.stringify([]));

    // Act
    const result = await Storage.getDeliveryRecords();

    // Assert
    expect(result).toEqual([]);
  });

  test('Property 6.8: Ordering should work with only pending records', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(deliveryRecordWithStatusArb('pending'), { minLength: 2, maxLength: 10 }),
        async (records) => {
          // Arrange
          const shuffled = [...records].sort(() => Math.random() - 0.5);
          await AsyncStorage.setItem('offline_delivery_records', JSON.stringify(shuffled));

          // Act
          const result = await Storage.getDeliveryRecords();

          // Assert - All should be pending and in descending date order
          expect(result.every(r => r.confirmation_status === 'pending')).toBe(true);
          
          for (let i = 0; i < result.length - 1; i++) {
            const currentDate = new Date(result[i].entry_date).getTime();
            const nextDate = new Date(result[i + 1].entry_date).getTime();
            expect(currentDate).toBeGreaterThanOrEqual(nextDate);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 6.9: Ordering should work with only confirmed records', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(deliveryRecordWithStatusArb('confirmed'), { minLength: 2, maxLength: 10 }),
        async (records) => {
          // Arrange
          const shuffled = [...records].sort(() => Math.random() - 0.5);
          await AsyncStorage.setItem('offline_delivery_records', JSON.stringify(shuffled));

          // Act
          const result = await Storage.getDeliveryRecords();

          // Assert - All should be confirmed and in descending date order
          expect(result.every(r => r.confirmation_status === 'confirmed')).toBe(true);
          
          for (let i = 0; i < result.length - 1; i++) {
            const currentDate = new Date(result[i].entry_date).getTime();
            const nextDate = new Date(result[i + 1].entry_date).getTime();
            expect(currentDate).toBeGreaterThanOrEqual(nextDate);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

