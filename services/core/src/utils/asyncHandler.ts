import { Request, Response, NextFunction } from 'express';

/**
 * Async handler wrapper for Express route handlers
 * Catches any errors and passes them to the next() middleware (error handler)
 *
 * Usage:
 * router.get('/endpoint', asyncHandler(async (req, res) => {
 *   const data = await someAsyncOperation();
 *   res.json(data);
 * }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
