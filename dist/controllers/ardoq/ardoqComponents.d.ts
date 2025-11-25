import { Request, Response } from "express";
/**
 * List all components in a workspace
 * GET /api/ardoq/workspaces/:workspaceId/components
 * Query params: Optional configId to use a specific configuration
 *
 * Fetches all components for the workspace using /api/v2/components?rootWorkspace=:workspaceId
 * Returns all components as a flat array (for use by other endpoints)
 */
export declare const listComponents: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=ardoqComponents.d.ts.map