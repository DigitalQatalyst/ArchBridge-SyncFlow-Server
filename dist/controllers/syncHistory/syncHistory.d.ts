import { Request, Response } from "express";
/**
 * List sync history records
 * GET /api/sync-history
 */
export declare const listSyncHistory: (req: Request, res: Response) => Promise<void>;
/**
 * Get sync history by ID
 * GET /api/sync-history/:id
 */
export declare const getSyncHistoryById: (req: Request, res: Response) => Promise<void>;
/**
 * Get sync history items
 * GET /api/sync-history/:id/items
 */
export declare const getSyncHistoryItems: (req: Request, res: Response) => Promise<void>;
/**
 * Get sync history statistics
 * GET /api/sync-history/stats
 */
export declare const getSyncHistoryStats: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=syncHistory.d.ts.map