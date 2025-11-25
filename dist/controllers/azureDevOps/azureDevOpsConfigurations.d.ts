import { Request, Response } from "express";
/**
 * Get all saved configurations
 * GET /api/azure-devops/configurations
 */
export declare const listConfigurations: (_req: Request, res: Response) => Promise<void>;
/**
 * Get a specific configuration by ID
 * GET /api/azure-devops/configurations/:id
 */
export declare const getConfiguration: (req: Request, res: Response) => Promise<void>;
/**
 * Get the active configuration
 * GET /api/azure-devops/configurations/active
 */
export declare const getActiveConfiguration: (_req: Request, res: Response) => Promise<void>;
/**
 * Update a configuration
 * PUT /api/azure-devops/configurations/:id
 */
export declare const updateConfiguration: (req: Request, res: Response) => Promise<void>;
/**
 * Delete a configuration
 * DELETE /api/azure-devops/configurations/:id
 */
export declare const deleteConfiguration: (req: Request, res: Response) => Promise<void>;
/**
 * Set a configuration as active
 * POST /api/azure-devops/configurations/:id/activate
 */
export declare const activateConfiguration: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=azureDevOpsConfigurations.d.ts.map