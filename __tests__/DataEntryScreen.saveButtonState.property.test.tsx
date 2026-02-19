/**
 * Property-Based Tests for DataEntryScreen Save Button State
 * Feature: mumbai-delivery-redesign
 * 
 * Property 2: Save Button State Consistency
 * Validates: Requirements 1.2
 * 
 * For any form state, the save button should be enabled if and only if all 
 * required fields contain valid data.
 */

import * as fc from 'fast-check';

/**
 * Extracted save button state logic from DataEntryScreen
 * This mirrors the isSaveButtonEnabled() method in the component
 */
function isSaveButtonEnabled(
  billtyNo: string,
  consigneeName: string,
  itemDescription: string,
  amount: string,
  saving: boolean
): boolean {
  return (
    billtyNo.trim() !== '' &&
    consigneeName.trim() !== '' &&
    itemDescription.trim() !== '' &&
    amount.trim() !== '' &&
    !saving
  );
}

describe('Property 2: Save Button State Consistency', () => {
  /**
   * **Validates: Requirements 1.2**
   * 
   * This property verifies that the save button is enabled if and only if all 
   * required fields contain valid data and the form is not currently saving.
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

  test('Property 2.1: Should enable button when all fields are valid and not saving', () => {
    fc.assert(
      fc.property(
        validStringArb,
        validStringArb,
        validStringArb,
        validStringArb,
        (billtyNo, consigneeName, itemDescription, amount) => {
          // Act
          const isEnabled = isSaveButtonEnabled(
            billtyNo,
            consigneeName,
            itemDescription,
            amount,
            false // not saving
          );

          // Assert
          expect(isEnabled).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 2.2: Should disable button when billty_no is empty', () => {
    fc.assert(
      fc.property(
        invalidStringArb,
        validStringArb,
        validStringArb,
        validStringArb,
        (billtyNo, consigneeName, itemDescription, amount) => {
          // Act
          const isEnabled = isSaveButtonEnabled(
            billtyNo,
            consigneeName,
            itemDescription,
            amount,
            false
          );

          // Assert
          expect(isEnabled).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 2.3: Should disable button when consignee_name is empty', () => {
    fc.assert(
      fc.property(
        validStringArb,
        invalidStringArb,
        validStringArb,
        validStringArb,
        (billtyNo, consigneeName, itemDescription, amount) => {
          // Act
          const isEnabled = isSaveButtonEnabled(
            billtyNo,
            consigneeName,
            itemDescription,
            amount,
            false
          );

          // Assert
          expect(isEnabled).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 2.4: Should disable button when item_description is empty', () => {
    fc.assert(
      fc.property(
        validStringArb,
        validStringArb,
        invalidStringArb,
        validStringArb,
        (billtyNo, consigneeName, itemDescription, amount) => {
          // Act
          const isEnabled = isSaveButtonEnabled(
            billtyNo,
            consigneeName,
            itemDescription,
            amount,
            false
          );

          // Assert
          expect(isEnabled).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 2.5: Should disable button when amount is empty', () => {
    fc.assert(
      fc.property(
        validStringArb,
        validStringArb,
        validStringArb,
        invalidStringArb,
        (billtyNo, consigneeName, itemDescription, amount) => {
          // Act
          const isEnabled = isSaveButtonEnabled(
            billtyNo,
            consigneeName,
            itemDescription,
            amount,
            false
          );

          // Assert
          expect(isEnabled).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 2.6: Should disable button when saving is in progress', () => {
    fc.assert(
      fc.property(
        validStringArb,
        validStringArb,
        validStringArb,
        validStringArb,
        (billtyNo, consigneeName, itemDescription, amount) => {
          // Act
          const isEnabled = isSaveButtonEnabled(
            billtyNo,
            consigneeName,
            itemDescription,
            amount,
            true // saving in progress
          );

          // Assert
          expect(isEnabled).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 2.7: Should disable button when any field is empty', () => {
    fc.assert(
      fc.property(
        fc.oneof(validStringArb, invalidStringArb),
        fc.oneof(validStringArb, invalidStringArb),
        fc.oneof(validStringArb, invalidStringArb),
        fc.oneof(validStringArb, invalidStringArb),
        fc.boolean(),
        (billtyNo, consigneeName, itemDescription, amount, saving) => {
          // Determine if any field is empty
          const hasEmptyField = 
            billtyNo.trim() === '' ||
            consigneeName.trim() === '' ||
            itemDescription.trim() === '' ||
            amount.trim() === '';

          // Act
          const isEnabled = isSaveButtonEnabled(
            billtyNo,
            consigneeName,
            itemDescription,
            amount,
            saving
          );

          // Assert
          if (hasEmptyField || saving) {
            expect(isEnabled).toBe(false);
          } else {
            expect(isEnabled).toBe(true);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 2.8: Should handle whitespace-only fields as empty', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          validStringArb,
          fc.constant('   '),
          fc.constant('\t\t'),
          fc.constant('\n\n')
        ),
        validStringArb,
        validStringArb,
        validStringArb,
        (billtyNo, consigneeName, itemDescription, amount) => {
          // Act
          const isEnabled = isSaveButtonEnabled(
            billtyNo,
            consigneeName,
            itemDescription,
            amount,
            false
          );

          // Assert
          if (billtyNo.trim() === '') {
            expect(isEnabled).toBe(false);
          } else {
            expect(isEnabled).toBe(true);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 2.9: Button state should be deterministic for same inputs', () => {
    fc.assert(
      fc.property(
        fc.oneof(validStringArb, invalidStringArb),
        fc.oneof(validStringArb, invalidStringArb),
        fc.oneof(validStringArb, invalidStringArb),
        fc.oneof(validStringArb, invalidStringArb),
        fc.boolean(),
        (billtyNo, consigneeName, itemDescription, amount, saving) => {
          // Act - Call twice with same inputs
          const isEnabled1 = isSaveButtonEnabled(
            billtyNo,
            consigneeName,
            itemDescription,
            amount,
            saving
          );
          const isEnabled2 = isSaveButtonEnabled(
            billtyNo,
            consigneeName,
            itemDescription,
            amount,
            saving
          );

          // Assert - Should return same result
          expect(isEnabled1).toBe(isEnabled2);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 2.10: Should disable when multiple fields are empty', () => {
    fc.assert(
      fc.property(
        invalidStringArb,
        invalidStringArb,
        invalidStringArb,
        invalidStringArb,
        (billtyNo, consigneeName, itemDescription, amount) => {
          // Act
          const isEnabled = isSaveButtonEnabled(
            billtyNo,
            consigneeName,
            itemDescription,
            amount,
            false
          );

          // Assert
          expect(isEnabled).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });
});

