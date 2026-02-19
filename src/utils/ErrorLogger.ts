// ErrorLogger.ts
// Centralized error logging utility for Mumbai Delivery feature
// Validates: Requirement 10.7

export interface ErrorContext {
  functionName: string;
  parameters?: Record<string, any>;
  additionalInfo?: string;
}

/**
 * Log error with context information
 * Includes function name, parameters, and additional context
 * 
 * @param error - Error object or message
 * @param context - Error context with function name and parameters
 */
export const logError = (
  error: Error | string,
  context: ErrorContext
): void => {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error(`❌ ERROR: ${errorMessage}`);
  console.error(`⏰ Timestamp: ${timestamp}`);
  console.error(`📍 Function: ${context.functionName}`);
  
  if (context.parameters) {
    console.error(`📋 Parameters:`, JSON.stringify(context.parameters, null, 2));
  }
  
  if (context.additionalInfo) {
    console.error(`ℹ️  Additional Info: ${context.additionalInfo}`);
  }
  
  if (errorStack) {
    console.error(`📚 Stack Trace:`, errorStack);
  }
  
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
};

/**
 * Log sync error with operation details
 * Specialized logging for sync operations
 * 
 * @param error - Error object or message
 * @param operation - Sync operation type
 * @param recordId - Record ID being synced
 * @param additionalDetails - Additional operation details
 */
export const logSyncError = (
  error: Error | string,
  operation: 'upload' | 'download' | 'update' | 'delete',
  recordId?: string,
  additionalDetails?: Record<string, any>
): void => {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error(`🔄 SYNC ERROR: ${errorMessage}`);
  console.error(`⏰ Timestamp: ${timestamp}`);
  console.error(`🔧 Operation: ${operation}`);
  
  if (recordId) {
    console.error(`🆔 Record ID: ${recordId}`);
  }
  
  if (additionalDetails) {
    console.error(`📋 Operation Details:`, JSON.stringify(additionalDetails, null, 2));
  }
  
  if (errorStack) {
    console.error(`📚 Stack Trace:`, errorStack);
  }
  
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
};

/**
 * Log validation error
 * Specialized logging for validation failures
 * 
 * @param fieldName - Name of the field that failed validation
 * @param value - Value that failed validation
 * @param errorMessage - Validation error message
 */
export const logValidationError = (
  fieldName: string,
  value: any,
  errorMessage: string
): void => {
  const timestamp = new Date().toISOString();

  console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.warn(`⚠️  VALIDATION ERROR: ${errorMessage}`);
  console.warn(`⏰ Timestamp: ${timestamp}`);
  console.warn(`📝 Field: ${fieldName}`);
  console.warn(`💾 Value: ${JSON.stringify(value)}`);
  console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
};

/**
 * Log info message with context
 * For non-error informational logging
 * 
 * @param message - Info message
 * @param context - Optional context information
 */
export const logInfo = (
  message: string,
  context?: Record<string, any>
): void => {
  const timestamp = new Date().toISOString();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`ℹ️  INFO: ${message}`);
  console.log(`⏰ Timestamp: ${timestamp}`);
  
  if (context) {
    console.log(`📋 Context:`, JSON.stringify(context, null, 2));
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
};
