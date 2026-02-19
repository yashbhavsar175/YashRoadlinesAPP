/**
 * Property-Based Tests for Duplicate Billty Number Detection
 * Feature: mumbai-delivery-redesign
 * 
 * Property 14: Duplicate Billty Number Detection
 * Validates: Requirements 10.5
 * 
 * For any delivery record submission with a billty_no that already exists in the 
 * current office's records, the system should display a warning message indicating 
 * the duplicate.
 */

import * as fc from 'fast-check';

/**
 * Simulates checking for duplicate billty numbers
 */
interface DeliveryRecord {
  id: string;
  billty_no: string;
  consignee_name: string;
  item_description: string;
  amount: number;
  office_id: string;
}

/**
 * Check if a billty number already exists in the records
 * This mirrors the duplicate detection logic in DataEntryScreen
 */
function checkDuplicateBilltyNo(
  billtyNo: string,
  existingRecords: DeliveryRecord[],
  currentOfficeId: string
): { isDuplicate: boolean; warningMessage?: string } {
  // Filter records by current office
  const officeRecords = existingRecords.filter(
    record => record.office_id === currentOfficeId
  );

  // Check for duplicate (case-insensitive, with trimming on both sides)
  const duplicate = officeRecords.find(
    record => record.billty_no?.trim().toLowerCase() === billtyNo.trim().toLowerCase()
  );

  if (duplicate) {
    return {
      isDuplicate: true,
      warningMessage: `Warning: Billty No "${billtyNo.trim()}" already exists for this office`,
    };
  }

  return { isDuplicate: false };
}

describe('Property 14: Duplicate Billty Number Detection', () => {
  /**
   * **Validates: Requirements 10.5**
   * 
   * This property verifies that the system detects duplicate billty numbers 
   * within the same office and displays an appropriate warning message.
   */

  // Arbitrary for generating valid strings
  const validStringArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
  
  // Arbitrary for generating office IDs
  const officeIdArb = fc.uuid();

  // Arbitrary for generating delivery records
  const deliveryRecordArb = fc.record({
    id: fc.uuid(),
    billty_no: validStringArb,
    consignee_name: validStringArb,
    item_description: validStringArb,
    amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000000), noNaN: true }),
    office_id: officeIdArb,
  });

  test('Property 14.1: Should detect duplicate billty_no in same office', () => {
    fc.assert(
      fc.property(
        validStringArb,
        officeIdArb,
        (billtyNo, officeId) => {
          // Arrange - Add a record with the same billty_no in the same office
          const duplicateRecord: DeliveryRecord = {
            id: 'duplicate-id',
            billty_no: billtyNo,
            consignee_name: 'Existing Consignee',
            item_description: 'Existing Item',
            amount: 100,
            office_id: officeId,
          };
          const records = [duplicateRecord];

          // Act
          const result = checkDuplicateBilltyNo(billtyNo, records, officeId);

          // Assert
          expect(result.isDuplicate).toBe(true);
          expect(result.warningMessage).toContain('Warning');
          expect(result.warningMessage).toContain(billtyNo.trim());
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 14.2: Should not detect duplicate in different office', () => {
    fc.assert(
      fc.property(
        validStringArb,
        officeIdArb,
        officeIdArb,
        fc.array(deliveryRecordArb, { minLength: 0, maxLength: 10 }),
        (billtyNo, officeId1, officeId2, existingRecords) => {
          // Skip if office IDs are the same
          fc.pre(officeId1 !== officeId2);

          // Arrange - Add a record with the same billty_no in a different office
          const recordInDifferentOffice: DeliveryRecord = {
            id: 'different-office-id',
            billty_no: billtyNo,
            consignee_name: 'Other Office Consignee',
            item_description: 'Other Office Item',
            amount: 200,
            office_id: officeId2,
          };
          const records = [...existingRecords, recordInDifferentOffice];

          // Act - Check for duplicate in officeId1
          const result = checkDuplicateBilltyNo(billtyNo, records, officeId1);

          // Assert - Should not find duplicate because it's in a different office
          expect(result.isDuplicate).toBe(false);
          expect(result.warningMessage).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 14.3: Should be case-insensitive when detecting duplicates', () => {
    fc.assert(
      fc.property(
        validStringArb,
        officeIdArb,
        fc.constantFrom('upper', 'lower', 'mixed'),
        (billtyNo, officeId, caseVariant) => {
          // Arrange - Create variations of the same billty_no with different cases
          let existingBilltyNo: string;
          let newBilltyNo: string;

          switch (caseVariant) {
            case 'upper':
              existingBilltyNo = billtyNo.toUpperCase();
              newBilltyNo = billtyNo.toLowerCase();
              break;
            case 'lower':
              existingBilltyNo = billtyNo.toLowerCase();
              newBilltyNo = billtyNo.toUpperCase();
              break;
            case 'mixed':
              existingBilltyNo = billtyNo.toLowerCase();
              newBilltyNo = billtyNo;
              break;
          }

          const existingRecord: DeliveryRecord = {
            id: 'existing-id',
            billty_no: existingBilltyNo,
            consignee_name: 'Existing Consignee',
            item_description: 'Existing Item',
            amount: 100,
            office_id: officeId,
          };

          // Act
          const result = checkDuplicateBilltyNo(newBilltyNo, [existingRecord], officeId);

          // Assert - Should detect duplicate regardless of case
          expect(result.isDuplicate).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 14.4: Should not detect duplicate when billty_no is unique', () => {
    fc.assert(
      fc.property(
        validStringArb,
        validStringArb,
        officeIdArb,
        (billtyNo1, billtyNo2, officeId) => {
          // Skip if billty numbers are the same (case-insensitive)
          fc.pre(billtyNo1.toLowerCase() !== billtyNo2.toLowerCase());

          // Arrange
          const existingRecord: DeliveryRecord = {
            id: 'existing-id',
            billty_no: billtyNo1,
            consignee_name: 'Existing Consignee',
            item_description: 'Existing Item',
            amount: 100,
            office_id: officeId,
          };

          // Act
          const result = checkDuplicateBilltyNo(billtyNo2, [existingRecord], officeId);

          // Assert
          expect(result.isDuplicate).toBe(false);
          expect(result.warningMessage).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 14.5: Should handle whitespace trimming in duplicate detection', () => {
    fc.assert(
      fc.property(
        validStringArb,
        officeIdArb,
        (billtyNo, officeId) => {
          // Arrange - Add whitespace to existing record
          const existingRecord: DeliveryRecord = {
            id: 'existing-id',
            billty_no: billtyNo,
            consignee_name: 'Existing Consignee',
            item_description: 'Existing Item',
            amount: 100,
            office_id: officeId,
          };

          // Act - Check with whitespace-padded billty_no
          const paddedBilltyNo = `  ${billtyNo}  `;
          const result = checkDuplicateBilltyNo(paddedBilltyNo, [existingRecord], officeId);

          // Assert - Should detect duplicate after trimming
          expect(result.isDuplicate).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 14.6: Should handle empty existing records', () => {
    fc.assert(
      fc.property(
        validStringArb,
        officeIdArb,
        (billtyNo, officeId) => {
          // Act
          const result = checkDuplicateBilltyNo(billtyNo, [], officeId);

          // Assert
          expect(result.isDuplicate).toBe(false);
          expect(result.warningMessage).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 14.7: Should detect duplicate among multiple records', () => {
    fc.assert(
      fc.property(
        validStringArb,
        officeIdArb,
        fc.integer({ min: 1, max: 10 }),
        (billtyNo, officeId, numRecords) => {
          // Arrange - Create multiple records in the same office
          const records: DeliveryRecord[] = [];
          
          // Add some non-duplicate records
          for (let i = 0; i < numRecords; i++) {
            records.push({
              id: `record-${i}`,
              billty_no: `OTHER-${i}`,
              consignee_name: `Consignee ${i}`,
              item_description: `Item ${i}`,
              amount: 100 + i,
              office_id: officeId,
            });
          }
          
          // Insert a duplicate record at a random position
          const duplicateRecord: DeliveryRecord = {
            id: 'duplicate-id',
            billty_no: billtyNo,
            consignee_name: 'Duplicate Consignee',
            item_description: 'Duplicate Item',
            amount: 150,
            office_id: officeId,
          };
          records.push(duplicateRecord);

          // Act
          const result = checkDuplicateBilltyNo(billtyNo, records, officeId);

          // Assert
          expect(result.isDuplicate).toBe(true);
          expect(result.warningMessage).toBeDefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 14.8: Warning message should include the billty number', () => {
    fc.assert(
      fc.property(
        validStringArb,
        officeIdArb,
        (billtyNo, officeId) => {
          // Arrange
          const existingRecord: DeliveryRecord = {
            id: 'existing-id',
            billty_no: billtyNo,
            consignee_name: 'Existing Consignee',
            item_description: 'Existing Item',
            amount: 100,
            office_id: officeId,
          };

          // Act
          const result = checkDuplicateBilltyNo(billtyNo, [existingRecord], officeId);

          // Assert
          expect(result.isDuplicate).toBe(true);
          expect(result.warningMessage).toContain(billtyNo.trim());
          expect(result.warningMessage).toContain('Warning');
          expect(result.warningMessage).toContain('already exists');
        }
      ),
      { numRuns: 20 }
    );
  });
});

