import { Request, Response } from "express";
import { fieldMappingStorage } from "../../services/fieldMappingStorage";
import { getAzureDevOpsClient } from "../../services/azureDevOpsClientHelper";
import {
  CreateFieldMappingConfigRequest,
  UpdateFieldMappingConfigRequest,
  WorkItemTypeDefinition,
  WorkItemField,
} from "../../types/fieldMapping";

/**
 * Get process template templates (system defaults)
 * GET /api/field-mapping/templates?processTemplateName={processTemplateName}
 */
export const getTemplates = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const processTemplateName = req.query.processTemplateName as string | undefined;

    const templates = await fieldMappingStorage.getTemplates(processTemplateName);

    res.json({
      success: true,
      data: templates,
    });
  } catch (error: any) {
    console.error("Error fetching field mapping templates:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch field mapping templates",
    });
  }
};

/**
 * Get field mapping configurations for a project
 * GET /api/field-mapping/configs?projectId={projectId}
 */
export const getFieldMappingConfigs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = req.query.projectId as string;

    if (!projectId || typeof projectId !== "string" || projectId.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "projectId query parameter is required and must be a non-empty string",
      });
      return;
    }

    const configs = await fieldMappingStorage.getConfigurationsByProject(projectId);

    res.json({
      success: true,
      data: configs,
    });
  } catch (error: any) {
    console.error("Error fetching field mapping configurations:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch field mapping configurations",
    });
  }
};

/**
 * Get a specific field mapping configuration
 * GET /api/field-mapping/configs/:id
 */
export const getFieldMappingConfig = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      res.status(400).json({
        success: false,
        error: "Configuration ID is required",
      });
      return;
    }

    const config = await fieldMappingStorage.getConfigurationById(id);

    if (!config) {
      res.status(404).json({
        success: false,
        error: "Field mapping configuration not found",
      });
      return;
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error("Error fetching field mapping configuration:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch field mapping configuration",
    });
  }
};

/**
 * Create a new field mapping configuration
 * POST /api/field-mapping/configs
 */
export const createFieldMappingConfig = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const body: CreateFieldMappingConfigRequest = req.body;

    // Validation
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "name is required and must be a non-empty string",
      });
      return;
    }

    if (!body.projectId || typeof body.projectId !== "string" || body.projectId.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "projectId is required and must be a non-empty string",
      });
      return;
    }

    if (!Array.isArray(body.mappings)) {
      res.status(400).json({
        success: false,
        error: "mappings must be an array",
      });
      return;
    }

    // Validate mappings
    for (const mapping of body.mappings) {
      if (!mapping.ardoqField || !mapping.azureDevOpsField || !mapping.workItemType) {
        res.status(400).json({
          success: false,
          error: "Each mapping must have ardoqField, azureDevOpsField, and workItemType",
        });
        return;
      }

      if (!["epic", "feature", "user_story"].includes(mapping.workItemType)) {
        res.status(400).json({
          success: false,
          error: `Invalid workItemType: ${mapping.workItemType}. Must be one of: epic, feature, user_story`,
        });
        return;
      }
    }

    const config = await fieldMappingStorage.saveConfiguration(
      {
        name: body.name.trim(),
        description: body.description,
        projectId: body.projectId.trim(),
        projectName: body.projectName,
        isDefault: body.isDefault ?? false,
      },
      body.mappings
    );

    res.status(201).json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error("Error creating field mapping configuration:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create field mapping configuration",
    });
  }
};

/**
 * Update a field mapping configuration
 * PUT /api/field-mapping/configs/:id
 */
export const updateFieldMappingConfig = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const body: UpdateFieldMappingConfigRequest = req.body;

    if (!id || typeof id !== "string") {
      res.status(400).json({
        success: false,
        error: "Configuration ID is required",
      });
      return;
    }

    // Validate mappings if provided
    if (body.mappings !== undefined) {
      if (!Array.isArray(body.mappings)) {
        res.status(400).json({
          success: false,
          error: "mappings must be an array",
        });
        return;
      }

      for (const mapping of body.mappings) {
        if (!mapping.ardoqField || !mapping.azureDevOpsField || !mapping.workItemType) {
          res.status(400).json({
            success: false,
            error: "Each mapping must have ardoqField, azureDevOpsField, and workItemType",
          });
          return;
        }

        if (!["epic", "feature", "user_story"].includes(mapping.workItemType)) {
          res.status(400).json({
            success: false,
            error: `Invalid workItemType: ${mapping.workItemType}. Must be one of: epic, feature, user_story`,
          });
          return;
        }
      }
    }

    const config = await fieldMappingStorage.updateConfiguration(
      id,
      {
        name: body.name?.trim(),
        description: body.description,
        projectName: body.projectName,
        isDefault: body.isDefault,
      },
      body.mappings
    );

    if (!config) {
      res.status(404).json({
        success: false,
        error: "Field mapping configuration not found",
      });
      return;
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error("Error updating field mapping configuration:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update field mapping configuration",
    });
  }
};

/**
 * Delete a field mapping configuration
 * DELETE /api/field-mapping/configs/:id
 */
export const deleteFieldMappingConfig = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      res.status(400).json({
        success: false,
        error: "Configuration ID is required",
      });
      return;
    }

    const deleted = await fieldMappingStorage.deleteConfiguration(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: "Field mapping configuration not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Field mapping configuration deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting field mapping configuration:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to delete field mapping configuration",
    });
  }
};

/**
 * Get work item types for a project with their fields
 * GET /api/field-mapping/work-item-types?projectId={projectId}&configId={configId}
 */
export const getWorkItemTypes = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = req.query.projectId as string;
    const configId = req.query.configId as string | undefined;

    if (!projectId || typeof projectId !== "string" || projectId.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "projectId query parameter is required and must be a non-empty string",
      });
      return;
    }

    // Get Azure DevOps client
    const client = await getAzureDevOpsClient(configId);

    // Get work item types
    const workItemTypes = await client.getWorkItemTypes(projectId);

    // Get all fields
    const allFields = await client.getFields(projectId);

    // Build response with fields for each work item type
    // Get fields for each work item type individually to ensure accuracy
    const result: WorkItemTypeDefinition[] = await Promise.all(
      workItemTypes.map(async (wit: any) => {
        // Get fields specifically for this work item type
        const fieldsForType = await client.getFieldsForWorkItemType(
          projectId,
          wit.name
        );

        const fields: WorkItemField[] = fieldsForType.map((field: any) => ({
          referenceName: field.referenceName,
          name: field.name,
          type: field.type,
          workItemTypes: Array.isArray(field.usage)
            ? field.usage
            : field.usage
            ? [field.usage]
            : undefined,
        }));

        return {
          name: wit.name,
          referenceName: wit.referenceName,
          fields,
        };
      })
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error fetching work item types:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to fetch work item types",
    });
  }
};

/**
 * Get available fields for a specific work item type
 * GET /api/field-mapping/fields?projectId={projectId}&workItemType={workItemType}&configId={configId}
 */
export const getFieldsForWorkItemType = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = req.query.projectId as string;
    const workItemType = req.query.workItemType as string;
    const configId = req.query.configId as string | undefined;

    if (!projectId || typeof projectId !== "string" || projectId.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "projectId query parameter is required and must be a non-empty string",
      });
      return;
    }

    if (!workItemType || typeof workItemType !== "string" || workItemType.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "workItemType query parameter is required and must be a non-empty string",
      });
      return;
    }

    // Get Azure DevOps client
    const client = await getAzureDevOpsClient(configId);

    // Get fields for the work item type
    // @ts-ignore
    const fields = await client.getFieldsForWorkItemType(projectId, workItemType);

    // Map to response format
    const result: WorkItemField[] = fields.map((field: any) => ({
      referenceName: field.referenceName,
      name: field.name,
      type: field.type,
      workItemTypes: Array.isArray(field.usage)
        ? field.usage
        : field.usage
        ? [field.usage]
        : undefined,
    }));

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error fetching fields for work item type:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to fetch fields for work item type",
    });
  }
};

