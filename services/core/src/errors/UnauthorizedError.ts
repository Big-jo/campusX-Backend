import { AppError } from './AppError';

/**
 * 401 Unauthorized Error
 * Use when authentication is required or fails
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(message, 401, details);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}
