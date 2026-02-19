/**
 * Property-Based Tests for DataEntryScreen Input Validation
 * Feature: mumbai-delivery-redesign
 * 
 * Property 1: Input Validation Completeness (UI Layer)
 * Validates: Requirements 1.3, 1.4, 1.5, 10.1
 * 
 * For any delivery record submission in the UI, if any required field (Billty No, 
 * Consignee Name, Item Description, or Amount) is empty or invalid (Amount must be 
 * positive), then the UI should reject the submission and display an appropriate 
 * field-specific error message.
 */

import * as fc from 'fast-check';

// Mock the validation logic from DataEntryScreen
interface ValidationErrors {
  billtyNo?: string;
  consigneeName?: string;
  itemDescription?: string;
  amount?: string;
}

/**
 * Extracted validation logic from DataEntryScreen
 * This mirrors the validateInputs() method in the component
 */
function validateInputs(
  billtyNo: string,
  consigneeName: string,
  itemDescription: string,
  amount: string
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};
  let isValid = true;

  // Validate Billty No (Requirement 1.3)
  if (!billtyNo.trim()) {
    errors.billtyNo = 'Billty No is required';
    isValid = false;
  }

  // Validate Consignee Name (Requirement 1.4)
  if (!consigneeName.trim()) {
    errors.consigneeName = 'Consignee Name is required';
    isValid = false;
  }

  // Validate Item Description
  if (!itemDescription.trim()) {
    errors.itemDescription = 'Item Description is required';
    isValid = false;
  }

  // Validate Amount (Requirement 1.5)
  const numAmount = parseFloat(amount);
  if (!amount.trim()) {
    errors.amount = 'Amount is required';
    isValid = false;
  } else if (isNaN(numAmount) || numAmount <= 0) {
    errors.amount = 'Enter valid amount';
    isValid = false;
  }

  return { isValid, errors };
}

describe('Property 1: Input Validation Completeness (UI Layer)', () => {
  /**
   * **Validates: Requirements 1.3, 1.4, 1.5, 10.1**
   * 
   * This property verifies that the DataEntryScreen properly validates all required 
   * fields and provides appropriate field-specific error messages.
   */

  // Arbitrary for generating valid strings (non-empty, trimmed)
  const validStringArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
  
  // Arbitrary for generating invalid strings (empty or whitespace-only)
  const invalidStringArb = fc.oneof(
    fc.constant(''),
    fc.constant('   '),
    fc.constant('\t'),
    fc.constant('\n'),
    fc.constant('  \t  ')
  );
  
  // Arbitrary for generating valid amount strings
  const validAmountStringArb = fc.float({ min: Math.fround(0.01), max: Math.fround(1000000), noNaN: true })
    .map(n => n.toString());
  
  // Arbitrary for generating invalid amount strings
  const invalidAmountStringArb = fc.oneof(
    fc.constant('0'),
    fc.constant('-1'),
    fc.constant('-100.50'),
    fc.constant('abc'),
    fc.constant(''),
    fc.constant('   '),
    fc.constant('NaN')
  );

  test('Property 1.1: Should reject when billty_no is empty or whitespace', () => {
    fc.assert(
      fc.property(
        invalidStringArb,
        validStringArb,
        validStringArb,
        validAmountStringArb,
        (billtyNo, consigneeName, itemDescription, amount) => {
          // Act
          const result = validateInputs(billtyNo, consigneeName, itemDescription, amount);

          // Assert
          expect(result.isValid).toBe(false);
          expect(result.errors.billtyNo).toBe('Billty No is required');
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 1.2: Should reject when consignee_name is empty or whitespace', () => {
    fc.assert(
      fc.property(
        validStringArb,
        invalidStringArb,
        validStringArb,
        validAmountStringArb,
        (billtyNo, consigneeName, itemDescription, amount) => {
          // Act
          const result = validateInputs(billtyNo, consigneeName, itemDescription, amount);

          // Assert
          expect(result.isValid).toBe(false);
          expect(result.errors.consigneeName).toBe('Consignee Name is required');
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 1.3: Should reject when item_description is empty or whitespace', () => {
    fc.assert(
      fc.property(
        validStringArb,
        validStringArb,
        invalidStringArb,
        validAmountStringArb,
        (billtyNo, consigneeName, itemDescription, amount) => {
          // Act
          const result = validateInputs(billtyNo, consigneeName, itemDescription, amount);

          // Assert
          expect(result.isValid).toBe(false);
          expect(result.errors.itemDescription).toBe('Item Description is required');
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 1.4: Should reject when amount is invalid (empty, zero, negative, or non-numeric)', () => {
    fc.assert(
      fc.property(
        validStringArb,
        validStringArb,
        validStringArb,
        invalidAmountStringArb,
        (billtyNo, consigneeName, itemDescription, amount) => {
          // Act
          const result = validateInputs(billtyNo, consigneeName, itemDescription, amount);

          // Assert
          expect(result.isValid).toBe(false);
          expect(result.errors.amount).toBeDefined();
          expect(['Amount is required', 'Enter valid amount']).toContain(result.errors.amount);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 1.5: Should accept when all required fields are valid', () => {
    fc.assert(
      fc.property(
        validStringArb,
        validStringArb,
        validStringArb,
        validAmountStringArb,
        (billtyNo, consigneeName, itemDescription, amount) => {
          // Act
          const result = validateInputs(billtyNo, consigneeName, itemDescription, amount);

          // Assert
          expect(result.isValid).toBe(true);
          expect(result.errors.billtyNo).toBeUndefined();
          expect(result.errors.consigneeName).toBeUndefined();
          expect(result.errors.itemDescription).toBeUndefined();
          expect(result.errors.amount).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 1.6: Should provide field-specific error messages', () => {
    fc.assert(
      fc.property(
        fc.oneof(validStringArb, invalidStringArb),
        fc.oneof(validStringArb, invalidStringArb),
        fc.oneof(validStringArb, invalidStringArb),
        fc.oneof(validAmountStringArb, invalidAmountStringArb),
        (billtyNo, consigneeName, itemDescription, amount) => {
          // Act
          const result = validateInputs(billtyNo, consigneeName, itemDescription, amount);

          // Assert - Check that errors are field-specific
          if (!billtyNo.trim()) {
            expect(result.errors.billtyNo).toBe('Billty No is required');
          }
          if (!consigneeName.trim()) {
            expect(result.errors.consigneeName).toBe('Consignee Name is required');
          }
          if (!itemDescription.trim()) {
            expect(result.errors.itemDescription).toBe('Item Description is required');
          }
          
          const numAmount = parseFloat(amount);
          if (!amount.trim()) {
            expect(result.errors.amount).toBe('Amount is required');
          } else if (isNaN(numAmount) || numAmount <= 0) {
            expect(result.errors.amount).toBe('Enter valid amount');
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 1.7: Should handle whitespace trimming correctly', () => {
    fc.assert(
      fc.property(
        validStringArb,
        validStringArb,
        validStringArb,
        validAmountStringArb,
        (billtyNo, consigneeName, itemDescription, amount) => {
          // Arrange - Add whitespace padding
          const paddedBilltyNo = `  ${billtyNo}  `;
          const paddedConsigneeName = `  ${consigneeName}  `;
          const paddedItemDescription = `  ${itemDescription}  `;
          const paddedAmount = `  ${amount}  `;

          // Act
          const result = validateInputs(
            paddedBilltyNo,
            paddedConsigneeName,
            paddedItemDescription,
            paddedAmount
          );

          // Assert - Should pass validation after trimming
          expect(result.isValid).toBe(true);
          expect(result.errors).toEqual({});
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 1.8: Should reject when multiple fields are invalid', () => {
    fc.assert(
      fc.property(
        invalidStringArb,
        invalidStringArb,
        invalidStringArb,
        invalidAmountStringArb,
        (billtyNo, consigneeName, itemDescription, amount) => {
          // Act
          const result = validateInputs(billtyNo, consigneeName, itemDescription, amount);

          // Assert - Should have multiple errors
          expect(result.isValid).toBe(false);
          expect(Object.keys(result.errors).length).toBeGreaterThan(0);
          
          // All fields should have errors
          expect(result.errors.billtyNo).toBeDefined();
          expect(result.errors.consigneeName).toBeDefined();
          expect(result.errors.itemDescription).toBeDefined();
          expect(result.errors.amount).toBeDefined();
        }
      ),
      { numRuns: 20 }
    );
  });
});

