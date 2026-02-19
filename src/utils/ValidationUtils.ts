// ValidationUtils.ts
// Comprehensive validation utilities for Mumbai Delivery feature
// Validates: Requirement 10.1

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validation constants
 */
export const VALIDATION_CONSTANTS = {
  BILLTY_NO_MAX_LENGTH: 50,
  CONSIGNEE_NAME_MAX_LENGTH: 100,
  ITEM_DESCRIPTION_MAX_LENGTH: 500,
  AMOUNT_MAX_VALUE: 10000000, // 1 crore
  AMOUNT_MAX_DECIMAL_PLACES: 2,
};

/**
 * Validate billty number format
 * Rules:
 * - Required (not empty)
 * - Alphanumeric characters only (letters, numbers, hyphens, underscores)
 * - Max length: 50 characters
 * 
 * @param billtyNo - Billty number to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export const validateBilltyNo = (billtyNo: string): ValidationResult => {
  // Check if empty
  if (!billtyNo || !billtyNo.trim()) {
    return {
      isValid: false,
      error: 'Billty No is required',
    };
  }

  const trimmed = billtyNo.trim();

  // Check max length
  if (trimmed.length > VALIDATION_CONSTANTS.BILLTY_NO_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Billty No must be ${VALIDATION_CONSTANTS.BILLTY_NO_MAX_LENGTH} characters or less`,
    };
  }

  // Check alphanumeric format (allow letters, numbers, hyphens, underscores, spaces)
  const alphanumericPattern = /^[a-zA-Z0-9\s\-_]+$/;
  if (!alphanumericPattern.test(trimmed)) {
    return {
      isValid: false,
      error: 'Billty No must contain only letters, numbers, hyphens, and underscores',
    };
  }

  return { isValid: true };
};

/**
 * Validate consignee name
 * Rules:
 * - Required (not empty)
 * - Max length: 100 characters
 * - No special characters except spaces, periods, commas, apostrophes, hyphens
 * 
 * @param consigneeName - Consignee name to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export const validateConsigneeName = (consigneeName: string): ValidationResult => {
  // Check if empty
  if (!consigneeName || !consigneeName.trim()) {
    return {
      isValid: false,
      error: 'Consignee Name is required',
    };
  }

  const trimmed = consigneeName.trim();

  // Check max length
  if (trimmed.length > VALIDATION_CONSTANTS.CONSIGNEE_NAME_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Consignee Name must be ${VALIDATION_CONSTANTS.CONSIGNEE_NAME_MAX_LENGTH} characters or less`,
    };
  }

  // Check for allowed characters (letters, numbers, spaces, periods, commas, apostrophes, hyphens)
  const namePattern = /^[a-zA-Z0-9\s.,'\-]+$/;
  if (!namePattern.test(trimmed)) {
    return {
      isValid: false,
      error: 'Consignee Name contains invalid characters',
    };
  }

  return { isValid: true };
};

/**
 * Validate item description
 * Rules:
 * - Required (not empty)
 * - Max length: 500 characters
 * 
 * @param itemDescription - Item description to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export const validateItemDescription = (itemDescription: string): ValidationResult => {
  // Check if empty
  if (!itemDescription || !itemDescription.trim()) {
    return {
      isValid: false,
      error: 'Item Description is required',
    };
  }

  const trimmed = itemDescription.trim();

  // Check max length
  if (trimmed.length > VALIDATION_CONSTANTS.ITEM_DESCRIPTION_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Item Description must be ${VALIDATION_CONSTANTS.ITEM_DESCRIPTION_MAX_LENGTH} characters or less`,
    };
  }

  return { isValid: true };
};

/**
 * Validate amount
 * Rules:
 * - Required (not empty)
 * - Must be a valid positive number
 * - Max value: 10,000,000 (1 crore)
 * - Max decimal places: 2
 * 
 * @param amount - Amount string to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export const validateAmount = (amount: string): ValidationResult => {
  // Check if empty
  if (!amount || !amount.trim()) {
    return {
      isValid: false,
      error: 'Amount is required',
    };
  }

  const trimmed = amount.trim();

  // Check if valid number
  const numAmount = parseFloat(trimmed);
  if (isNaN(numAmount)) {
    return {
      isValid: false,
      error: 'Enter valid amount',
    };
  }

  // Check if positive
  if (numAmount <= 0) {
    return {
      isValid: false,
      error: 'Amount must be greater than zero',
    };
  }

  // Check max value
  if (numAmount > VALIDATION_CONSTANTS.AMOUNT_MAX_VALUE) {
    return {
      isValid: false,
      error: `Amount must be ${VALIDATION_CONSTANTS.AMOUNT_MAX_VALUE.toLocaleString()} or less`,
    };
  }

  // Check decimal places
  const decimalParts = trimmed.split('.');
  if (decimalParts.length > 1 && decimalParts[1].length > VALIDATION_CONSTANTS.AMOUNT_MAX_DECIMAL_PLACES) {
    return {
      isValid: false,
      error: `Amount can have maximum ${VALIDATION_CONSTANTS.AMOUNT_MAX_DECIMAL_PLACES} decimal places`,
    };
  }

  return { isValid: true };
};

/**
 * Validate all delivery record fields
 * Convenience function to validate all fields at once
 * 
 * @param billtyNo - Billty number
 * @param consigneeName - Consignee name
 * @param itemDescription - Item description
 * @param amount - Amount string
 * @returns Object with validation results for each field
 */
export const validateDeliveryRecord = (
  billtyNo: string,
  consigneeName: string,
  itemDescription: string,
  amount: string
): {
  isValid: boolean;
  errors: {
    billtyNo?: string;
    consigneeName?: string;
    itemDescription?: string;
    amount?: string;
  };
} => {
  const billtyNoResult = validateBilltyNo(billtyNo);
  const consigneeNameResult = validateConsigneeName(consigneeName);
  const itemDescriptionResult = validateItemDescription(itemDescription);
  const amountResult = validateAmount(amount);

  const errors: {
    billtyNo?: string;
    consigneeName?: string;
    itemDescription?: string;
    amount?: string;
  } = {};

  if (!billtyNoResult.isValid) {
    errors.billtyNo = billtyNoResult.error;
  }
  if (!consigneeNameResult.isValid) {
    errors.consigneeName = consigneeNameResult.error;
  }
  if (!itemDescriptionResult.isValid) {
    errors.itemDescription = itemDescriptionResult.error;
  }
  if (!amountResult.isValid) {
    errors.amount = amountResult.error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
