import { Request, Response, NextFunction } from 'express';
interface CustomError extends Error {
    statusCode?: number;
}
export declare const errorHandler: (err: CustomError, req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=errorHandler.d.ts.map