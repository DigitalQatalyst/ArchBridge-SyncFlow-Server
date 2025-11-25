import { Request, Response } from "express";
/**
 * Get field mapping configurations for a project
 * GET /api/field-mapping/configs?projectId={projectId}
 */
export declare const getFieldMappingConfigs: (req: Request, res: Response) => Promise<void>;
/**
 * Get a specific field mapping configuration
 * GET /api/field-mapping/configs/:id
 */
export declare const getFieldMappingConfig: (req: Request, res: Response) => Promise<void>;
/**
 * Create a new field mapping configuration
 * POST /api/field-mapping/configs
 */
export declare const createFieldMappingConfig: (req: Request, res: Response) => Promise<void>;
/**
 * Update a field mapping configuration
 * PUT /api/field-mapping/configs/:id
 */
export declare const updateFieldMappingConfig: (req: Request, res: Response) => Promise<void>;
/**
 * Delete a field mapping configuration
 * DELETE /api/field-mapping/configs/:id
 */
export declare const deleteFieldMappingConfig: (req: Request, res: Response) => Promise<void>;
/**
 * Get work item types for a project with their fields
 * GET /api/field-mapping/work-item-types?projectId={projectId}&configId={configId}
 */
export declare const getWorkItemTypes: (req: Request, res: Response) => Promise<void>;
/**
 * Get available fields for a specific work item type
 * GET /api/field-mapping/fields?projectId={projectId}&workItemType={workItemType}&configId={configId}
 */
export declare const getFieldsForWorkItemType: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=fieldMapping.d.ts.map