import { Request, Response } from 'express';

// 404 Not Found middleware
export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
};

