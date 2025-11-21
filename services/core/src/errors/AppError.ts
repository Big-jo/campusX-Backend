/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Operational errors are expected errors (not bugs)

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
