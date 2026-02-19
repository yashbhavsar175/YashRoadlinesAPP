/**
 * Property-Based Tests for Data Migration Field Mapping
 * Feature: mumbai-delivery-redesign
 * 
 * Property 13: Data Migration Field Mapping
 * Validates: Requirements 8.2, 8.3
 * 
 * For any existing AgencyEntry record with agency_name='Mumbai', when migrated to the new schema,
 * the description field should be mapped to item_description, and any missing required fields
 * (billty_no, consignee_name) should be populated with placeholder values.
 */

import * as fc from 'fast-check';
import { AgencyEntry } from '../src/data/Storage';
import { mapLegacyRecordFields } from '../src/utils/migrateExistingMumbaiRecords';

describe('Property 13: Data Migration Field Mapping', () => {
  /**
   * **Validates: Requirements 8.2, 8.3**
   * 
   * This property verifies that legacy Mumbai records are correctly mapped to the new schema
   * with appropriate placeholder values for missing fields.
   */

  // Arbitrary for generating legacy AgencyEntry records
  // Use ISO string directly to avoid invalid date issues
  const isoDateArb = fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString());
  
  const legacyAgencyEntryArb = fc.record({
    id: fc.uuid(),
    agency_id: fc.uuid(),
    agency_name: fc.constant('Mumbai'),
    description: fc.string({ minLength: 1, maxLength: 200 }),
    amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000000), noNaN: true, noDefaultInfinity: true }),
    entry_type: fc.constantFrom('credit' as const, 'debit' as const),
    entry_date: isoDateArb,
    office_id: fc.option(fc.uuid(), { nil: undefined }),
    office_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    created_by: fc.option(fc.uuid(), { nil: undefined }),
    created_at: isoDateArb,
    updated_at: isoDateArb,
    delivery_status: fc.option(fc.constantFrom('yes' as const, 'no' as const), { nil: undefined }),
  });

  test('Property 13.1: description field should be mapped to item_description', () => {
    fc.assert(
      fc.property(
        legacyAgencyEntryArb,
        (record) => {
          // Act
          const mappedFields = mapLegacyRecordFields(record);

          // Assert
          expect(mappedFields.item_description).toBe(record.description);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 13.2: billty_no should be generated as MIGRATED-{first 8 chars of id}', () => {
    fc.assert(
      fc.property(
        legacyAgencyEntryArb,
        (record) => {
          // Act
          const mappedFields = mapLegacyRecordFields(record);

          // Assert
          const expectedBilltyNo = `MIGRATED-${record.id.slice(0, 8)}`;
          expect(mappedFields.billty_no).toBe(expectedBilltyNo);
          expect(mappedFields.billty_no).toMatch(/^MIGRATED-/);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 13.3: consignee_name should be set to "Legacy Record"', () => {
    fc.assert(
      fc.property(
        legacyAgencyEntryArb,
        (record) => {
          // Act
          const mappedFields = mapLegacyRecordFields(record);

          // Assert
          expect(mappedFields.consignee_name).toBe('Legacy Record');
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 13.4: delivery_status="yes" should map to confirmation_status="confirmed"', () => {
    fc.assert(
      fc.property(
        legacyAgencyEntryArb.filter(r => r.delivery_status === 'yes'),
        (record) => {
          // Act
          const mappedFields = mapLegacyRecordFields(record);

          // Assert
          expect(mappedFields.confirmation_status).toBe('confirmed');
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 13.5: delivery_status="no" should map to confirmation_status="pending"', () => {
    fc.assert(
      fc.property(
        legacyAgencyEntryArb.filter(r => r.delivery_status === 'no'),
        (record) => {
          // Act
          const mappedFields = mapLegacyRecordFields(record);

          // Assert
          expect(mappedFields.confirmation_status).toBe('pending');
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 13.6: undefined delivery_status should map to confirmation_status="pending"', () => {
    fc.assert(
      fc.property(
        legacyAgencyEntryArb.filter(r => r.delivery_status === undefined),
        (record) => {
          // Act
          const mappedFields = mapLegacyRecordFields(record);

          // Assert
          expect(mappedFields.confirmation_status).toBe('pending');
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 13.7: taken_from_godown should match delivery_status="yes"', () => {
    fc.assert(
      fc.property(
        legacyAgencyEntryArb,
        (record) => {
          // Act
          const mappedFields = mapLegacyRecordFields(record);

          // Assert
          const expectedValue = record.delivery_status === 'yes';
          expect(mappedFields.taken_from_godown).toBe(expectedValue);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 13.8: payment_received should match delivery_status="yes"', () => {
    fc.assert(
      fc.property(
        legacyAgencyEntryArb,
        (record) => {
          // Act
          const mappedFields = mapLegacyRecordFields(record);

          // Assert
          const expectedValue = record.delivery_status === 'yes';
          expect(mappedFields.payment_received).toBe(expectedValue);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 13.9: confirmed_at should be set when delivery_status="yes"', () => {
    fc.assert(
      fc.property(
        legacyAgencyEntryArb.filter(r => r.delivery_status === 'yes'),
        (record) => {
          // Act
          const mappedFields = mapLegacyRecordFields(record);

          // Assert
          expect(mappedFields.confirmed_at).toBe(record.updated_at);
          expect(mappedFields.confirmed_at).toBeDefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 13.10: confirmed_at should be undefined when delivery_status!="yes"', () => {
    fc.assert(
      fc.property(
        legacyAgencyEntryArb.filter(r => r.delivery_status !== 'yes'),
        (record) => {
          // Act
          const mappedFields = mapLegacyRecordFields(record);

          // Assert
          expect(mappedFields.confirmed_at).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 13.11: confirmed_amount should equal amount when delivery_status="yes"', () => {
    fc.assert(
      fc.property(
        legacyAgencyEntryArb.filter(r => r.delivery_status === 'yes'),
        (record) => {
          // Act
          const mappedFields = mapLegacyRecordFields(record);

          // Assert
          expect(mappedFields.confirmed_amount).toBe(record.amount);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 13.12: confirmed_amount should be undefined when delivery_status!="yes"', () => {
    fc.assert(
      fc.property(
        legacyAgencyEntryArb.filter(r => r.delivery_status !== 'yes'),
        (record) => {
          // Act
          const mappedFields = mapLegacyRecordFields(record);

          // Assert
          expect(mappedFields.confirmed_amount).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 13.13: All required fields should be present in mapped result', () => {
    fc.assert(
      fc.property(
        legacyAgencyEntryArb,
        (record) => {
          // Act
          const mappedFields = mapLegacyRecordFields(record);

          // Assert - Check all required fields are present
          expect(mappedFields).toHaveProperty('billty_no');
          expect(mappedFields).toHaveProperty('consignee_name');
          expect(mappedFields).toHaveProperty('item_description');
          expect(mappedFields).toHaveProperty('confirmation_status');
          expect(mappedFields).toHaveProperty('taken_from_godown');
          expect(mappedFields).toHaveProperty('payment_received');
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 13.14: Mapping should be idempotent for the same record', () => {
    fc.assert(
      fc.property(
        legacyAgencyEntryArb,
        (record) => {
          // Act
          const mappedFields1 = mapLegacyRecordFields(record);
          const mappedFields2 = mapLegacyRecordFields(record);

          // Assert - Both mappings should be identical
          expect(mappedFields1).toEqual(mappedFields2);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 13.15: Empty description should map to empty item_description', () => {
    fc.assert(
      fc.property(
        legacyAgencyEntryArb.map(r => ({ ...r, description: '' })),
        (record) => {
          // Act
          const mappedFields = mapLegacyRecordFields(record);

          // Assert
          expect(mappedFields.item_description).toBe('');
        }
      ),
      { numRuns: 20 }
    );
  });
});

