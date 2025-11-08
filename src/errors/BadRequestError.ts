import { AppError } from './AppError';

/**
 * 400 Bad Request Error
 * Use for general client errors (invalid params, malformed requests, etc.)
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: any) {
    super(message, 400, details);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}
