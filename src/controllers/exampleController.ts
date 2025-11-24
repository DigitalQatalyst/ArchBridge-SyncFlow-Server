import { Request, Response } from 'express';

// Example controller structure
// Controllers handle the business logic for routes

export const exampleFunction = (req: Request, res: Response): void => {
  try {
    // Your business logic here
    res.json({ 
      success: true,
      message: 'Example controller function',
      data: {}
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

