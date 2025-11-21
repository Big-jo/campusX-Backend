/**
 * Error codes for internal tracking and logging
 * Not exposed in API responses, used for debugging and monitoring
 */
export enum ErrorCode {
  // User errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_UPDATE_FAILED = 'USER_UPDATE_FAILED',
  INVALID_INTERESTS = 'INVALID_INTERESTS',
  INTERESTS_SAVE_FAILED = 'INTERESTS_SAVE_FAILED',

  // Campus errors
  CAMPUS_NOT_FOUND = 'CAMPUS_NOT_FOUND',

  // Auth errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_REQUEST = 'INVALID_REQUEST',

  // Generic errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
