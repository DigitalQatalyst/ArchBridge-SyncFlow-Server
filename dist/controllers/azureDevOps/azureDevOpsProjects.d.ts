import { Request, Response } from "express";
/**
 * Get all available process templates for the organization
 * GET /api/azure-devops/processes?configId=xxx
 * Query params: configId (optional) - If provided, uses that configuration. If omitted, uses active configuration.
 */
export declare const getProcessTemplates: (req: Request, res: Response) => Promise<void>;
/**
 * List all projects in the organization
 * GET /api/azure-devops/projects?configId=xxx
 * Query params: configId (optional) - If provided, uses that configuration. If omitted, uses active configuration.
 */
export declare const listProjects: (req: Request, res: Response) => Promise<void>;
/**
 * Create a new Azure DevOps project
 * POST /api/azure-devops/projects?configId=xxx
 * Query params: configId (optional) - If provided, uses that configuration. If omitted, uses active configuration.
 */
export declare const createProject: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=azureDevOpsProjects.d.ts.map