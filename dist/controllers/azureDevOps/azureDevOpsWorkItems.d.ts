import { Request, Response } from "express";
/**
 * Check if a project has work items
 * GET /api/azure-devops/projects/:project/workitems/check?configId=xxx
 * Query params: configId (optional) - If provided, uses that configuration. If omitted, uses active configuration.
 */
export declare const checkWorkItems: (req: Request, res: Response) => Promise<void>;
/**
 * Create work items from Ardoq hierarchy
 * POST /api/azure-devops/projects/:project/workitems?configId=xxx
 * Uses Server-Sent Events (SSE) to stream progress updates
 */
export declare const createWorkItems: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=azureDevOpsWorkItems.d.ts.map