import { AppError } from './AppError';

/**
 * 400 Validation Error
 * Use when request data fails validation
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 400, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
