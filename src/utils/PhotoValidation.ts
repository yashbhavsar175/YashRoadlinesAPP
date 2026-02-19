// PhotoValidation.ts
// Photo validation utilities for Mumbai Delivery feature
// Validates: Requirement 4.4

export interface PhotoValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Photo validation constants
 */
export const PHOTO_VALIDATION_CONSTANTS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB in bytes
  VALID_MIME_TYPES: ['image/jpeg', 'image/jpg', 'image/png'],
  VALID_EXTENSIONS: ['.jpg', '.jpeg', '.png'],
};

/**
 * Validate photo file type (MIME type check)
 * Rules:
 * - Must be image/jpeg, image/jpg, or image/png
 * 
 * @param mimeType - MIME type string to validate
 * @returns PhotoValidationResult with isValid flag and optional error message
 */
export const validatePhotoFileType = (mimeType: string): PhotoValidationResult => {
  if (!mimeType) {
    return {
      isValid: false,
      error: 'File type is missing',
    };
  }

  const normalizedMimeType = mimeType.toLowerCase().trim();

  if (!PHOTO_VALIDATION_CONSTANTS.VALID_MIME_TYPES.includes(normalizedMimeType)) {
    return {
      isValid: false,
      error: 'Please select an image file (JPG or PNG)',
    };
  }

  return { isValid: true };
};

/**
 * Validate photo file size
 * Rules:
 * - Must be less than or equal to 5MB
 * 
 * @param fileSize - File size in bytes
 * @returns PhotoValidationResult with isValid flag and optional error message
 */
export const validatePhotoFileSize = (fileSize: number): PhotoValidationResult => {
  if (fileSize === undefined || fileSize === null) {
    return {
      isValid: false,
      error: 'File size is missing',
    };
  }

  if (fileSize <= 0) {
    return {
      isValid: false,
      error: 'Invalid file size',
    };
  }

  if (fileSize > PHOTO_VALIDATION_CONSTANTS.MAX_FILE_SIZE) {
    const maxSizeMB = PHOTO_VALIDATION_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024);
    return {
      isValid: false,
      error: `Photo file size must be less than ${maxSizeMB}MB`,
    };
  }

  return { isValid: true };
};

/**
 * Validate photo file extension
 * Rules:
 * - Must be .jpg, .jpeg, or .png
 * 
 * @param fileName - File name to validate
 * @returns PhotoValidationResult with isValid flag and optional error message
 */
export const validatePhotoFileExtension = (fileName: string): PhotoValidationResult => {
  if (!fileName) {
    return {
      isValid: false,
      error: 'File name is missing',
    };
  }

  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));

  if (!PHOTO_VALIDATION_CONSTANTS.VALID_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: 'Please select a JPG or PNG image file',
    };
  }

  return { isValid: true };
};

/**
 * Validate complete photo data
 * Convenience function to validate all photo attributes at once
 * 
 * @param mimeType - MIME type string
 * @param fileSize - File size in bytes
 * @param fileName - File name
 * @returns PhotoValidationResult with isValid flag and optional error message
 */
export const validatePhoto = (
  mimeType: string,
  fileSize: number,
  fileName: string
): PhotoValidationResult => {
  // Validate file type
  const fileTypeResult = validatePhotoFileType(mimeType);
  if (!fileTypeResult.isValid) {
    return fileTypeResult;
  }

  // Validate file size
  const fileSizeResult = validatePhotoFileSize(fileSize);
  if (!fileSizeResult.isValid) {
    return fileSizeResult;
  }

  // Validate file extension
  const fileExtensionResult = validatePhotoFileExtension(fileName);
  if (!fileExtensionResult.isValid) {
    return fileExtensionResult;
  }

  return { isValid: true };
};

/**
 * Format file size for display
 * Converts bytes to human-readable format
 * 
 * @param bytes - File size in bytes
 * @returns Formatted file size string (e.g., "2.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
