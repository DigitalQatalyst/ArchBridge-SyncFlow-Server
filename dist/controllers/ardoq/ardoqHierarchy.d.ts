import { Request, Response } from "express";
/**
 * Get all domains in a workspace
 * GET /api/ardoq/workspaces/:workspaceId/domains
 * Query params: Optional configId to use a specific configuration
 *
 * Returns minimal data: { id, name, type } for dropdown usage
 */
export declare const getDomains: (req: Request, res: Response) => Promise<void>;
/**
 * Get all initiatives for a specific domain
 * GET /api/ardoq/workspaces/:workspaceId/domains/:domainId/initiatives
 * Query params: Optional configId to use a specific configuration
 *
 * Returns minimal data: { id, name, type, parent } for dropdown usage
 */
export declare const getInitiativesForDomain: (req: Request, res: Response) => Promise<void>;
/**
 * Get the complete hierarchy for a specific initiative
 * GET /api/ardoq/workspaces/:workspaceId/initiatives/:initiativeId/hierarchy
 * Query params: Optional configId to use a specific configuration
 *
 * Returns full hierarchy: Epics → Features → User Stories
 * Uses buildComponentHierarchy to build the nested structure
 */
export declare const getInitiativeHierarchy: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=ardoqHierarchy.d.ts.map