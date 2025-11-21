import { AppError } from './AppError';

/**
 * 404 Not Found Error
 * Use when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 404, details);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
