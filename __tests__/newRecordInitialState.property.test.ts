/**
 * Property-Based Tests for New Record Initial State
 * Feature: mumbai-delivery-redesign
 * 
 * Property 3: New Record Initial State
 * Validates: Requirements 1.6
 * 
 * For any successfully saved delivery record, the record should have 
 * confirmation_status='pending', taken_from_godown=false, and payment_received=false.
 * 
 * Note: These tests verify the initial state by mocking the storage layer to capture
 * what data is being saved, since the test environment may not support full persistence.
 */

import * as fc from 'fast-check';
import * as Storage from '../src/data/Storage';
import { supabase } from '../src/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock console.error to avoid cluttering test output
let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('Property 3: New Record Initial State', () => {
  /**
   * **Validates: Requirements 1.6**
   * 
   * This property verifies that any successfully saved delivery record has the correct
   * initial state: confirmation_status='pending', taken_from_godown=false, and 
   * payment_received=false.
   */

  // Arbitrary for generating valid delivery record data
  const validStringArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
  // Use a higher minimum to avoid floating point precision issues and filter to ensure > 0
  const validAmountArb = fc.float({ min: Math.fround(0.1), max: Math.fround(1000000), noNaN: true, noDefaultInfinity: true }).filter(a => a > 0);
  
  // Arbitrary for generating a valid delivery record
  const validDeliveryRecordArb = fc.record({
    billty_no: validStringArb,
    consignee_name: validStringArb,
    item_description: validStringArb,
    amount: validAmountArb,
  });

  test('Property 3.1: New records should have confirmation_status="pending"', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDeliveryRecordArb,
        async (record) => {
          // Spy on AsyncStorage.setItem to capture what's being saved
          const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
          
          // Arrange
          const newRecord = {
            billty_no: record.billty_no,
            consignee_name: record.consignee_name,
            item_description: record.item_description,
            amount: record.amount,
          };

          // Act
          const result = await Storage.saveDeliveryRecord(newRecord);

          // Assert
          expect(result).toBe(true);
          
          // Find the call that saved to DELIVERY_RECORDS key
          const deliveryRecordsCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          
          expect(deliveryRecordsCall).toBeDefined();
          const savedData = JSON.parse(deliveryRecordsCall![1]);
          const savedRecord = Array.isArray(savedData) ? savedData[0] : savedData;
          expect(savedRecord.confirmation_status).toBe('pending');
          
          setItemSpy.mockRestore();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 3.2: New records should have taken_from_godown=false', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDeliveryRecordArb,
        async (record) => {
          // Spy on AsyncStorage.setItem to capture what's being saved
          const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
          
          // Arrange
          const newRecord = {
            billty_no: record.billty_no,
            consignee_name: record.consignee_name,
            item_description: record.item_description,
            amount: record.amount,
          };

          // Act
          const result = await Storage.saveDeliveryRecord(newRecord);

          // Assert
          expect(result).toBe(true);
          
          // Find the call that saved to DELIVERY_RECORDS key
          const deliveryRecordsCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          
          expect(deliveryRecordsCall).toBeDefined();
          const savedData = JSON.parse(deliveryRecordsCall![1]);
          const savedRecord = Array.isArray(savedData) ? savedData[0] : savedData;
          expect(savedRecord.taken_from_godown).toBe(false);
          
          setItemSpy.mockRestore();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 3.3: New records should have payment_received=false', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDeliveryRecordArb,
        async (record) => {
          // Spy on AsyncStorage.setItem to capture what's being saved
          const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
          
          // Arrange
          const newRecord = {
            billty_no: record.billty_no,
            consignee_name: record.consignee_name,
            item_description: record.item_description,
            amount: record.amount,
          };

          // Act
          const result = await Storage.saveDeliveryRecord(newRecord);

          // Assert
          expect(result).toBe(true);
          
          // Find the call that saved to DELIVERY_RECORDS key
          const deliveryRecordsCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          
          expect(deliveryRecordsCall).toBeDefined();
          const savedData = JSON.parse(deliveryRecordsCall![1]);
          const savedRecord = Array.isArray(savedData) ? savedData[0] : savedData;
          expect(savedRecord.payment_received).toBe(false);
          
          setItemSpy.mockRestore();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 3.4: All three initial state properties should be set correctly together', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDeliveryRecordArb,
        async (record) => {
          // Spy on AsyncStorage.setItem to capture what's being saved
          const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
          
          // Arrange
          const newRecord = {
            billty_no: record.billty_no,
            consignee_name: record.consignee_name,
            item_description: record.item_description,
            amount: record.amount,
          };

          // Act
          const result = await Storage.saveDeliveryRecord(newRecord);

          // Assert
          expect(result).toBe(true);
          
          // Find the call that saved to DELIVERY_RECORDS key
          const deliveryRecordsCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          
          expect(deliveryRecordsCall).toBeDefined();
          const savedData = JSON.parse(deliveryRecordsCall![1]);
          const savedRecord = Array.isArray(savedData) ? savedData[0] : savedData;
          expect(savedRecord.confirmation_status).toBe('pending');
          expect(savedRecord.taken_from_godown).toBe(false);
          expect(savedRecord.payment_received).toBe(false);
          
          setItemSpy.mockRestore();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 3.5: Initial state should not be affected by explicit false values', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDeliveryRecordArb,
        async (record) => {
          // Spy on AsyncStorage.setItem to capture what's being saved
          const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
          
          // Arrange - Explicitly provide false values
          const newRecord = {
            billty_no: record.billty_no,
            consignee_name: record.consignee_name,
            item_description: record.item_description,
            amount: record.amount,
            taken_from_godown: false,
            payment_received: false,
          };

          // Act
          const result = await Storage.saveDeliveryRecord(newRecord);

          // Assert
          expect(result).toBe(true);
          
          // Find the call that saved to DELIVERY_RECORDS key
          const deliveryRecordsCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          
          expect(deliveryRecordsCall).toBeDefined();
          const savedData = JSON.parse(deliveryRecordsCall![1]);
          const savedRecord = Array.isArray(savedData) ? savedData[0] : savedData;
          expect(savedRecord.confirmation_status).toBe('pending');
          expect(savedRecord.taken_from_godown).toBe(false);
          expect(savedRecord.payment_received).toBe(false);
          
          setItemSpy.mockRestore();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 3.6: Initial state should use provided confirmation_status or default to pending', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDeliveryRecordArb,
        fc.constantFrom('pending', 'confirmed'),
        async (record, providedStatus) => {
          // Spy on AsyncStorage.setItem to capture what's being saved
          const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
          
          // Arrange
          const newRecord = {
            billty_no: record.billty_no,
            consignee_name: record.consignee_name,
            item_description: record.item_description,
            amount: record.amount,
            confirmation_status: providedStatus,
          };

          // Act
          const result = await Storage.saveDeliveryRecord(newRecord);

          // Assert
          expect(result).toBe(true);
          
          // Find the call that saved to DELIVERY_RECORDS key
          const deliveryRecordsCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          
          expect(deliveryRecordsCall).toBeDefined();
          const savedData = JSON.parse(deliveryRecordsCall![1]);
          const savedRecord = Array.isArray(savedData) ? savedData[0] : savedData;
          expect(savedRecord.confirmation_status).toBe(providedStatus);
          
          setItemSpy.mockRestore();
        }
      ),
      { numRuns: 20 }
    );
  });
});

