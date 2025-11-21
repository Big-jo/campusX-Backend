import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';

/**
 * Centralized error handler middleware for V2 endpoints
 *
 * Response format: { message, error?: details }
 *
 * - Recognizes custom AppError classes and uses their statusCode
 * - Defaults to 500 for unknown errors
 * - Logs errors with context for debugging
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Determine if this is a custom AppError
  const isAppError = err instanceof AppError;

  // Get status code (default to 500 for unknown errors)
  const statusCode = isAppError ? err.statusCode : 500;

  // Get error message
  const message = err.message || 'Internal server error';

  // Get error details if available
  const details = isAppError ? err.details : undefined;

  // Log error with context
  const logContext = {
    message,
    statusCode,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id,
    stack: err.stack,
    isOperational: isAppError ? err.isOperational : false,
  };

  // Log non-operational errors as errors (bugs), operational as warnings
  if (isAppError && err.isOperational) {
    console.warn('Operational error:', logContext);
  } else {
    console.error('Unexpected error:', logContext);
  }

  // Build response according to spec: { message, error?: details }
  const response: { message: string; error?: any } = { message };

  if (details) {
    response.error = details;
  }

  // Send response
  res.status(statusCode).json(response);
};
