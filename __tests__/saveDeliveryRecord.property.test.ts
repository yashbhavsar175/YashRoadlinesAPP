/**
 * Property-Based Tests for saveDeliveryRecord Validation
 * Feature: mumbai-delivery-redesign
 * 
 * Property 1: Input Validation Completeness
 * Validates: Requirements 1.3, 1.4, 1.5, 10.1
 * 
 * For any delivery record submission, if any required field (Billty No, Consignee Name, 
 * Item Description, or Amount) is empty or invalid (Amount must be positive), then the 
 * system should reject the submission and display an appropriate field-specific error message.
 */

import * as fc from 'fast-check';
import * as Storage from '../src/data/Storage';
import { supabase } from '../src/supabase';

// Mock console.error to capture validation error messages
let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('Property 1: Input Validation Completeness', () => {
  /**
   * **Validates: Requirements 1.3, 1.4, 1.5, 10.1**
   * 
   * This property verifies that saveDeliveryRecord properly validates all required fields
   * and rejects invalid inputs with appropriate error messages.
   */

  // Arbitrary for generating valid strings (non-empty, trimmed)
  const validStringArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
  
  // Arbitrary for generating invalid strings (empty or whitespace-only)
  const invalidStringArb = fc.oneof(
    fc.constant(''),
    fc.constant('   '),
    fc.constant('\t'),
    fc.constant('\n')
  );
  
  // Arbitrary for generating valid positive amounts
  const validAmountArb = fc.float({ min: Math.fround(0.01), max: Math.fround(1000000), noNaN: true });
  
  // Arbitrary for generating invalid amounts (zero, negative, or NaN)
  const invalidAmountArb = fc.oneof(
    fc.constant(0),
    fc.float({ min: Math.fround(-1000000), max: Math.fround(-0.01), noNaN: true }),
    fc.constant(NaN)
  );

  test('Property 1.1: Should reject when billty_no is empty or whitespace', async () => {
    await fc.assert(
      fc.asyncProperty(
        invalidStringArb,
        validStringArb,
        validStringArb,
        validAmountArb,
        async (billtyNo, consigneeName, itemDescription, amount) => {
          // Arrange
          const record = {
            billty_no: billtyNo,
            consignee_name: consigneeName,
            item_description: itemDescription,
            amount: amount,
          };

          // Act
          const result = await Storage.saveDeliveryRecord(record);

          // Assert
          expect(result).toBe(false);
          expect(consoleErrorSpy).toHaveBeenCalledWith('Billty No is required');
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 1.2: Should reject when consignee_name is empty or whitespace', async () => {
    await fc.assert(
      fc.asyncProperty(
        validStringArb,
        invalidStringArb,
        validStringArb,
        validAmountArb,
        async (billtyNo, consigneeName, itemDescription, amount) => {
          // Arrange
          const record = {
            billty_no: billtyNo,
            consignee_name: consigneeName,
            item_description: itemDescription,
            amount: amount,
          };

          // Act
          const result = await Storage.saveDeliveryRecord(record);

          // Assert
          expect(result).toBe(false);
          expect(consoleErrorSpy).toHaveBeenCalledWith('Consignee Name is required');
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 1.3: Should reject when item_description is empty or whitespace', async () => {
    await fc.assert(
      fc.asyncProperty(
        validStringArb,
        validStringArb,
        invalidStringArb,
        validAmountArb,
        async (billtyNo, consigneeName, itemDescription, amount) => {
          // Arrange
          const record = {
            billty_no: billtyNo,
            consignee_name: consigneeName,
            item_description: itemDescription,
            amount: amount,
          };

          // Act
          const result = await Storage.saveDeliveryRecord(record);

          // Assert
          expect(result).toBe(false);
          expect(consoleErrorSpy).toHaveBeenCalledWith('Item Description is required');
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 1.4: Should reject when amount is zero, negative, or NaN', async () => {
    await fc.assert(
      fc.asyncProperty(
        validStringArb,
        validStringArb,
        validStringArb,
        invalidAmountArb,
        async (billtyNo, consigneeName, itemDescription, amount) => {
          // Arrange
          const record = {
            billty_no: billtyNo,
            consignee_name: consigneeName,
            item_description: itemDescription,
            amount: amount,
          };

          // Act
          const result = await Storage.saveDeliveryRecord(record);

          // Assert
          expect(result).toBe(false);
          expect(consoleErrorSpy).toHaveBeenCalledWith('Amount must be a positive number');
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 1.5: Should accept when all required fields are valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        validStringArb,
        validStringArb,
        validStringArb,
        validAmountArb,
        async (billtyNo, consigneeName, itemDescription, amount) => {
          // Arrange
          const record = {
            billty_no: billtyNo,
            consignee_name: consigneeName,
            item_description: itemDescription,
            amount: amount,
          };

          // Act
          const result = await Storage.saveDeliveryRecord(record);

          // Assert
          // The function should return true (success) or false (failure due to network/database issues)
          // But it should NOT fail due to validation errors
          expect(consoleErrorSpy).not.toHaveBeenCalledWith('Billty No is required');
          expect(consoleErrorSpy).not.toHaveBeenCalledWith('Consignee Name is required');
          expect(consoleErrorSpy).not.toHaveBeenCalledWith('Item Description is required');
          expect(consoleErrorSpy).not.toHaveBeenCalledWith('Amount must be a positive number');
        }
      ),
      { numRuns: 20 } // Reduced runs since this involves actual storage operations
    );
  });

  test('Property 1.6: Should reject when multiple fields are invalid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(validStringArb, invalidStringArb),
        fc.oneof(validStringArb, invalidStringArb),
        fc.oneof(validStringArb, invalidStringArb),
        fc.oneof(validAmountArb, invalidAmountArb),
        async (billtyNo, consigneeName, itemDescription, amount) => {
          // Arrange
          const record = {
            billty_no: billtyNo,
            consignee_name: consigneeName,
            item_description: itemDescription,
            amount: amount,
          };

          // Determine if any field is invalid
          const isBilltyInvalid = !billtyNo || billtyNo.trim() === '';
          const isConsigneeInvalid = !consigneeName || consigneeName.trim() === '';
          const isDescriptionInvalid = !itemDescription || itemDescription.trim() === '';
          const isAmountInvalid = !amount || amount <= 0 || isNaN(amount);
          const hasInvalidField = isBilltyInvalid || isConsigneeInvalid || isDescriptionInvalid || isAmountInvalid;

          // Act
          const result = await Storage.saveDeliveryRecord(record);

          // Assert
          if (hasInvalidField) {
            expect(result).toBe(false);
            // At least one validation error should be logged
            expect(consoleErrorSpy).toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 1.7: Should validate in correct order (billty_no first)', async () => {
    await fc.assert(
      fc.asyncProperty(
        invalidStringArb,
        invalidStringArb,
        invalidStringArb,
        invalidAmountArb,
        async (billtyNo, consigneeName, itemDescription, amount) => {
          // Arrange
          const record = {
            billty_no: billtyNo,
            consignee_name: consigneeName,
            item_description: itemDescription,
            amount: amount,
          };

          // Act
          const result = await Storage.saveDeliveryRecord(record);

          // Assert
          expect(result).toBe(false);
          // Should fail on billty_no first (validation order)
          expect(consoleErrorSpy).toHaveBeenCalledWith('Billty No is required');
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 1.8: Should trim whitespace from valid inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        validStringArb,
        validStringArb,
        validStringArb,
        validAmountArb,
        async (billtyNo, consigneeName, itemDescription, amount) => {
          // Arrange - Add whitespace padding
          const record = {
            billty_no: `  ${billtyNo}  `,
            consignee_name: `  ${consigneeName}  `,
            item_description: `  ${itemDescription}  `,
            amount: amount,
          };

          // Act
          const result = await Storage.saveDeliveryRecord(record);

          // Assert
          // Should not fail validation due to whitespace
          expect(consoleErrorSpy).not.toHaveBeenCalledWith('Billty No is required');
          expect(consoleErrorSpy).not.toHaveBeenCalledWith('Consignee Name is required');
          expect(consoleErrorSpy).not.toHaveBeenCalledWith('Item Description is required');
        }
      ),
      { numRuns: 20 }
    );
  });
});

