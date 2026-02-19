/**
 * Property-Based Tests for Confirmation State Transition
 * Feature: mumbai-delivery-redesign
 * 
 * Property 8: Confirmation State Transition Completeness
 * Validates: Requirements 3.7, 3.9, 5.1, 5.2
 * 
 * For any delivery record that undergoes payment confirmation with valid data 
 * (confirmed amount and both photos), the record should transition to 
 * confirmation_status='confirmed', taken_from_godown=true, payment_received=true, 
 * and should have confirmed_at timestamp, bilty_photo_id, and signature_photo_id populated.
 * 
 * Note: These tests verify the state transition by mocking the storage layer to capture
 * what data is being saved, since the test environment may not support full persistence.
 */

import * as fc from 'fast-check';
import * as Storage from '../src/data/Storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock console.error to avoid cluttering test output
let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('Property 8: Confirmation State Transition Completeness', () => {
  /**
   * **Validates: Requirements 3.7, 3.9, 5.1, 5.2**
   * 
   * This property verifies that any delivery record undergoing payment confirmation
   * with valid data transitions to the correct confirmed state with all required fields.
   */

  // Arbitrary for generating valid strings
  const validStringArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
  
  // Arbitrary for generating valid amounts
  const validAmountArb = fc.float({ min: Math.fround(0.1), max: Math.fround(1000000), noNaN: true, noDefaultInfinity: true }).filter(a => a > 0);
  
  // Arbitrary for generating valid photo data
  const validPhotoDataArb = fc.record({
    uri: fc.webUrl(),
    fileName: validStringArb,
    fileSize: fc.integer({ min: 1000, max: 5000000 }),
    mimeType: fc.constantFrom('image/jpeg', 'image/png', 'image/jpg'),
    timestamp: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ms => new Date(ms).toISOString()),
  });

  // Arbitrary for generating a valid delivery record
  const validDeliveryRecordArb = fc.record({
    billty_no: validStringArb,
    consignee_name: validStringArb,
    item_description: validStringArb,
    amount: validAmountArb,
  });

  // Arbitrary for generating a valid payment confirmation
  const validPaymentConfirmationArb = fc.record({
    delivery_record_id: fc.uuid(),
    confirmed_amount: validAmountArb,
    bilty_photo: validPhotoDataArb,
    signature_photo: validPhotoDataArb,
    confirmed_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ms => new Date(ms).toISOString()),
  });

  test('Property 8.1: Confirmed records should have confirmation_status="confirmed"', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDeliveryRecordArb,
        validPaymentConfirmationArb,
        async (deliveryRecord, confirmation) => {
          // Spy on AsyncStorage to capture what's being saved
          const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
          const getItemSpy = jest.spyOn(AsyncStorage, 'getItem');
          
          // Arrange - Create a delivery record first
          const savedRecord = await Storage.saveDeliveryRecord(deliveryRecord);
          expect(savedRecord).toBe(true);
          
          // Get the saved record to get its ID
          const deliveryRecordsCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          expect(deliveryRecordsCall).toBeDefined();
          const savedData = JSON.parse(deliveryRecordsCall![1]);
          const record = Array.isArray(savedData) ? savedData[0] : savedData;
          
          // Mock getItem to return the saved record
          getItemSpy.mockImplementation((key) => {
            if (key === 'offline_delivery_records') {
              return Promise.resolve(JSON.stringify([record]));
            }
            return Promise.resolve(null);
          });
          
          // Update confirmation with the actual record ID
          const updatedConfirmation = {
            ...confirmation,
            delivery_record_id: record.id,
          };
          
          // Clear previous spy calls
          setItemSpy.mockClear();
          
          // Act - Confirm the payment
          const result = await Storage.confirmDeliveryPayment(updatedConfirmation);
          
          // Assert
          expect(result).toBe(true);
          
          // Find the call that updated DELIVERY_RECORDS
          const updateCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          
          expect(updateCall).toBeDefined();
          const updatedData = JSON.parse(updateCall![1]);
          const confirmedRecord = Array.isArray(updatedData) ? updatedData[0] : updatedData;
          expect(confirmedRecord.confirmation_status).toBe('confirmed');
          
          setItemSpy.mockRestore();
          getItemSpy.mockRestore();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 8.2: Confirmed records should have taken_from_godown=true', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDeliveryRecordArb,
        validPaymentConfirmationArb,
        async (deliveryRecord, confirmation) => {
          // Spy on AsyncStorage to capture what's being saved
          const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
          const getItemSpy = jest.spyOn(AsyncStorage, 'getItem');
          
          // Arrange - Create a delivery record first
          const savedRecord = await Storage.saveDeliveryRecord(deliveryRecord);
          expect(savedRecord).toBe(true);
          
          // Get the saved record to get its ID
          const deliveryRecordsCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          expect(deliveryRecordsCall).toBeDefined();
          const savedData = JSON.parse(deliveryRecordsCall![1]);
          const record = Array.isArray(savedData) ? savedData[0] : savedData;
          
          // Mock getItem to return the saved record
          getItemSpy.mockImplementation((key) => {
            if (key === 'offline_delivery_records') {
              return Promise.resolve(JSON.stringify([record]));
            }
            return Promise.resolve(null);
          });
          
          // Update confirmation with the actual record ID
          const updatedConfirmation = {
            ...confirmation,
            delivery_record_id: record.id,
          };
          
          // Clear previous spy calls
          setItemSpy.mockClear();
          
          // Act - Confirm the payment
          const result = await Storage.confirmDeliveryPayment(updatedConfirmation);
          
          // Assert
          expect(result).toBe(true);
          
          // Find the call that updated DELIVERY_RECORDS
          const updateCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          
          expect(updateCall).toBeDefined();
          const updatedData = JSON.parse(updateCall![1]);
          const confirmedRecord = Array.isArray(updatedData) ? updatedData[0] : updatedData;
          expect(confirmedRecord.taken_from_godown).toBe(true);
          
          setItemSpy.mockRestore();
          getItemSpy.mockRestore();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 8.3: Confirmed records should have payment_received=true', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDeliveryRecordArb,
        validPaymentConfirmationArb,
        async (deliveryRecord, confirmation) => {
          // Spy on AsyncStorage to capture what's being saved
          const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
          const getItemSpy = jest.spyOn(AsyncStorage, 'getItem');
          
          // Arrange - Create a delivery record first
          const savedRecord = await Storage.saveDeliveryRecord(deliveryRecord);
          expect(savedRecord).toBe(true);
          
          // Get the saved record to get its ID
          const deliveryRecordsCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          expect(deliveryRecordsCall).toBeDefined();
          const savedData = JSON.parse(deliveryRecordsCall![1]);
          const record = Array.isArray(savedData) ? savedData[0] : savedData;
          
          // Mock getItem to return the saved record
          getItemSpy.mockImplementation((key) => {
            if (key === 'offline_delivery_records') {
              return Promise.resolve(JSON.stringify([record]));
            }
            return Promise.resolve(null);
          });
          
          // Update confirmation with the actual record ID
          const updatedConfirmation = {
            ...confirmation,
            delivery_record_id: record.id,
          };
          
          // Clear previous spy calls
          setItemSpy.mockClear();
          
          // Act - Confirm the payment
          const result = await Storage.confirmDeliveryPayment(updatedConfirmation);
          
          // Assert
          expect(result).toBe(true);
          
          // Find the call that updated DELIVERY_RECORDS
          const updateCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          
          expect(updateCall).toBeDefined();
          const updatedData = JSON.parse(updateCall![1]);
          const confirmedRecord = Array.isArray(updatedData) ? updatedData[0] : updatedData;
          expect(confirmedRecord.payment_received).toBe(true);
          
          setItemSpy.mockRestore();
          getItemSpy.mockRestore();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 8.4: Confirmed records should have confirmed_at timestamp populated', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDeliveryRecordArb,
        validPaymentConfirmationArb,
        async (deliveryRecord, confirmation) => {
          // Spy on AsyncStorage to capture what's being saved
          const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
          const getItemSpy = jest.spyOn(AsyncStorage, 'getItem');
          
          // Arrange - Create a delivery record first
          const savedRecord = await Storage.saveDeliveryRecord(deliveryRecord);
          expect(savedRecord).toBe(true);
          
          // Get the saved record to get its ID
          const deliveryRecordsCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          expect(deliveryRecordsCall).toBeDefined();
          const savedData = JSON.parse(deliveryRecordsCall![1]);
          const record = Array.isArray(savedData) ? savedData[0] : savedData;
          
          // Mock getItem to return the saved record
          getItemSpy.mockImplementation((key) => {
            if (key === 'offline_delivery_records') {
              return Promise.resolve(JSON.stringify([record]));
            }
            return Promise.resolve(null);
          });
          
          // Update confirmation with the actual record ID
          const updatedConfirmation = {
            ...confirmation,
            delivery_record_id: record.id,
          };
          
          // Clear previous spy calls
          setItemSpy.mockClear();
          
          // Act - Confirm the payment
          const result = await Storage.confirmDeliveryPayment(updatedConfirmation);
          
          // Assert
          expect(result).toBe(true);
          
          // Find the call that updated DELIVERY_RECORDS
          const updateCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          
          expect(updateCall).toBeDefined();
          const updatedData = JSON.parse(updateCall![1]);
          const confirmedRecord = Array.isArray(updatedData) ? updatedData[0] : updatedData;
          expect(confirmedRecord.confirmed_at).toBeDefined();
          expect(confirmedRecord.confirmed_at).toBeTruthy();
          // Verify it's a valid ISO date string
          expect(new Date(confirmedRecord.confirmed_at).toISOString()).toBe(confirmedRecord.confirmed_at);
          
          setItemSpy.mockRestore();
          getItemSpy.mockRestore();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 8.5: Confirmed records should have bilty_photo_id populated', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDeliveryRecordArb,
        validPaymentConfirmationArb,
        async (deliveryRecord, confirmation) => {
          // Spy on AsyncStorage to capture what's being saved
          const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
          const getItemSpy = jest.spyOn(AsyncStorage, 'getItem');
          
          // Arrange - Create a delivery record first
          const savedRecord = await Storage.saveDeliveryRecord(deliveryRecord);
          expect(savedRecord).toBe(true);
          
          // Get the saved record to get its ID
          const deliveryRecordsCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          expect(deliveryRecordsCall).toBeDefined();
          const savedData = JSON.parse(deliveryRecordsCall![1]);
          const record = Array.isArray(savedData) ? savedData[0] : savedData;
          
          // Mock getItem to return the saved record
          getItemSpy.mockImplementation((key) => {
            if (key === 'offline_delivery_records') {
              return Promise.resolve(JSON.stringify([record]));
            }
            return Promise.resolve(null);
          });
          
          // Update confirmation with the actual record ID
          const updatedConfirmation = {
            ...confirmation,
            delivery_record_id: record.id,
          };
          
          // Clear previous spy calls
          setItemSpy.mockClear();
          
          // Act - Confirm the payment
          const result = await Storage.confirmDeliveryPayment(updatedConfirmation);
          
          // Assert
          expect(result).toBe(true);
          
          // Find the call that updated DELIVERY_RECORDS
          const updateCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          
          expect(updateCall).toBeDefined();
          const updatedData = JSON.parse(updateCall![1]);
          const confirmedRecord = Array.isArray(updatedData) ? updatedData[0] : updatedData;
          expect(confirmedRecord.bilty_photo_id).toBeDefined();
          expect(confirmedRecord.bilty_photo_id).toBeTruthy();
          
          setItemSpy.mockRestore();
          getItemSpy.mockRestore();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 8.6: Confirmed records should have signature_photo_id populated', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDeliveryRecordArb,
        validPaymentConfirmationArb,
        async (deliveryRecord, confirmation) => {
          // Spy on AsyncStorage to capture what's being saved
          const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
          const getItemSpy = jest.spyOn(AsyncStorage, 'getItem');
          
          // Arrange - Create a delivery record first
          const savedRecord = await Storage.saveDeliveryRecord(deliveryRecord);
          expect(savedRecord).toBe(true);
          
          // Get the saved record to get its ID
          const deliveryRecordsCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          expect(deliveryRecordsCall).toBeDefined();
          const savedData = JSON.parse(deliveryRecordsCall![1]);
          const record = Array.isArray(savedData) ? savedData[0] : savedData;
          
          // Mock getItem to return the saved record
          getItemSpy.mockImplementation((key) => {
            if (key === 'offline_delivery_records') {
              return Promise.resolve(JSON.stringify([record]));
            }
            return Promise.resolve(null);
          });
          
          // Update confirmation with the actual record ID
          const updatedConfirmation = {
            ...confirmation,
            delivery_record_id: record.id,
          };
          
          // Clear previous spy calls
          setItemSpy.mockClear();
          
          // Act - Confirm the payment
          const result = await Storage.confirmDeliveryPayment(updatedConfirmation);
          
          // Assert
          expect(result).toBe(true);
          
          // Find the call that updated DELIVERY_RECORDS
          const updateCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          
          expect(updateCall).toBeDefined();
          const updatedData = JSON.parse(updateCall![1]);
          const confirmedRecord = Array.isArray(updatedData) ? updatedData[0] : updatedData;
          expect(confirmedRecord.signature_photo_id).toBeDefined();
          expect(confirmedRecord.signature_photo_id).toBeTruthy();
          
          setItemSpy.mockRestore();
          getItemSpy.mockRestore();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 8.7: All confirmation fields should be set correctly together', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDeliveryRecordArb,
        validPaymentConfirmationArb,
        async (deliveryRecord, confirmation) => {
          // Spy on AsyncStorage to capture what's being saved
          const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
          const getItemSpy = jest.spyOn(AsyncStorage, 'getItem');
          
          // Arrange - Create a delivery record first
          const savedRecord = await Storage.saveDeliveryRecord(deliveryRecord);
          expect(savedRecord).toBe(true);
          
          // Get the saved record to get its ID
          const deliveryRecordsCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          expect(deliveryRecordsCall).toBeDefined();
          const savedData = JSON.parse(deliveryRecordsCall![1]);
          const record = Array.isArray(savedData) ? savedData[0] : savedData;
          
          // Mock getItem to return the saved record
          getItemSpy.mockImplementation((key) => {
            if (key === 'offline_delivery_records') {
              return Promise.resolve(JSON.stringify([record]));
            }
            return Promise.resolve(null);
          });
          
          // Update confirmation with the actual record ID
          const updatedConfirmation = {
            ...confirmation,
            delivery_record_id: record.id,
          };
          
          // Clear previous spy calls
          setItemSpy.mockClear();
          
          // Act - Confirm the payment
          const result = await Storage.confirmDeliveryPayment(updatedConfirmation);
          
          // Assert
          expect(result).toBe(true);
          
          // Find the call that updated DELIVERY_RECORDS
          const updateCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          
          expect(updateCall).toBeDefined();
          const updatedData = JSON.parse(updateCall![1]);
          const confirmedRecord = Array.isArray(updatedData) ? updatedData[0] : updatedData;
          
          // Verify all required fields are set correctly
          expect(confirmedRecord.confirmation_status).toBe('confirmed');
          expect(confirmedRecord.taken_from_godown).toBe(true);
          expect(confirmedRecord.payment_received).toBe(true);
          expect(confirmedRecord.confirmed_at).toBeDefined();
          expect(confirmedRecord.confirmed_at).toBeTruthy();
          expect(confirmedRecord.bilty_photo_id).toBeDefined();
          expect(confirmedRecord.bilty_photo_id).toBeTruthy();
          expect(confirmedRecord.signature_photo_id).toBeDefined();
          expect(confirmedRecord.signature_photo_id).toBeTruthy();
          
          setItemSpy.mockRestore();
          getItemSpy.mockRestore();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 8.8: Confirmed amount should match the provided confirmation amount', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDeliveryRecordArb,
        validPaymentConfirmationArb,
        async (deliveryRecord, confirmation) => {
          // Spy on AsyncStorage to capture what's being saved
          const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
          const getItemSpy = jest.spyOn(AsyncStorage, 'getItem');
          
          // Arrange - Create a delivery record first
          const savedRecord = await Storage.saveDeliveryRecord(deliveryRecord);
          expect(savedRecord).toBe(true);
          
          // Get the saved record to get its ID
          const deliveryRecordsCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          expect(deliveryRecordsCall).toBeDefined();
          const savedData = JSON.parse(deliveryRecordsCall![1]);
          const record = Array.isArray(savedData) ? savedData[0] : savedData;
          
          // Mock getItem to return the saved record
          getItemSpy.mockImplementation((key) => {
            if (key === 'offline_delivery_records') {
              return Promise.resolve(JSON.stringify([record]));
            }
            return Promise.resolve(null);
          });
          
          // Update confirmation with the actual record ID
          const updatedConfirmation = {
            ...confirmation,
            delivery_record_id: record.id,
          };
          
          // Clear previous spy calls
          setItemSpy.mockClear();
          
          // Act - Confirm the payment
          const result = await Storage.confirmDeliveryPayment(updatedConfirmation);
          
          // Assert
          expect(result).toBe(true);
          
          // Find the call that updated DELIVERY_RECORDS
          const updateCall = setItemSpy.mock.calls.find(call => 
            call[0] === 'offline_delivery_records'
          );
          
          expect(updateCall).toBeDefined();
          const updatedData = JSON.parse(updateCall![1]);
          const confirmedRecord = Array.isArray(updatedData) ? updatedData[0] : updatedData;
          expect(confirmedRecord.confirmed_amount).toBe(confirmation.confirmed_amount);
          
          setItemSpy.mockRestore();
          getItemSpy.mockRestore();
        }
      ),
      { numRuns: 20 }
    );
  });
});

