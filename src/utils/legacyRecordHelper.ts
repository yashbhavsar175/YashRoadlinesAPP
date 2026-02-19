/**
 * Helper utilities for identifying and handling legacy migrated records
 */

import { DeliveryRecord } from '../data/Storage';

/**
 * Checks if a delivery record is a legacy migrated record
 * @param record Delivery record to check
 * @returns true if the record is a legacy migrated record
 */
export const isLegacyRecord = (record: DeliveryRecord): boolean => {
  return record.billty_no?.startsWith('MIGRATED-') || false;
};

/**
 * Gets a tooltip/explanation text for legacy records
 * @returns Explanation text for legacy records
 */
export const getLegacyRecordTooltip = (): string => {
  return 'This is a migrated record from the old system. Some fields may contain placeholder values.';
};

/**
 * Gets the original record ID from a migrated billty number
 * @param billtyNo Billty number (e.g., "MIGRATED-abc12345")
 * @returns Original record ID or null if not a migrated record
 */
export const getOriginalRecordId = (billtyNo: string): string | null => {
  if (billtyNo?.startsWith('MIGRATED-')) {
    return billtyNo.substring(9); // Remove "MIGRATED-" prefix
  }
  return null;
};
