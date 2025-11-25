import { Request, Response } from "express";
/**
 * List all workspaces
 * GET /api/ardoq/workspaces
 * Query params: Optional Ardoq API query parameters, optional configId to use a specific configuration
 */
export declare const listWorkspaces: (req: Request, res: Response) => Promise<void>;
/**
 * Get a specific workspace by ID
 * GET /api/ardoq/workspaces/:id
 */
export declare const getWorkspace: (req: Request, res: Response) => Promise<void>;
/**
 * Get workspace context
 * GET /api/ardoq/workspaces/:id/context
 * Returns metadata about the workspace including component types, reference types, etc.
 */
export declare const getWorkspaceContext: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=ardoqWorkspaces.d.ts.map