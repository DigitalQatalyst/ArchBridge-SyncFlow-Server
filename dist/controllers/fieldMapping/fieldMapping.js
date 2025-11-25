"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFieldsForWorkItemType = exports.getWorkItemTypes = exports.deleteFieldMappingConfig = exports.updateFieldMappingConfig = exports.createFieldMappingConfig = exports.getFieldMappingConfig = exports.getFieldMappingConfigs = void 0;
const fieldMappingStorage_1 = require("../../services/fieldMappingStorage");
const azureDevOpsClientHelper_1 = require("../../services/azureDevOpsClientHelper");
/**
 * Get field mapping configurations for a project
 * GET /api/field-mapping/configs?projectId={projectId}
 */
const getFieldMappingConfigs = async (req, res) => {
    try {
        const projectId = req.query.projectId;
        if (!projectId || typeof projectId !== "string" || projectId.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: "projectId query parameter is required and must be a non-empty string",
            });
            return;
        }
        const configs = await fieldMappingStorage_1.fieldMappingStorage.getConfigurationsByProject(projectId);
        res.json({
            success: true,
            data: configs,
        });
    }
    catch (error) {
        console.error("Error fetching field mapping configurations:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch field mapping configurations",
        });
    }
};
exports.getFieldMappingConfigs = getFieldMappingConfigs;
/**
 * Get a specific field mapping configuration
 * GET /api/field-mapping/configs/:id
 */
const getFieldMappingConfig = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || typeof id !== "string") {
            res.status(400).json({
                success: false,
                error: "Configuration ID is required",
            });
            return;
        }
        const config = await fieldMappingStorage_1.fieldMappingStorage.getConfigurationById(id);
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
    }
    catch (error) {
        console.error("Error fetching field mapping configuration:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch field mapping configuration",
        });
    }
};
exports.getFieldMappingConfig = getFieldMappingConfig;
/**
 * Create a new field mapping configuration
 * POST /api/field-mapping/configs
 */
const createFieldMappingConfig = async (req, res) => {
    try {
        const body = req.body;
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
        const config = await fieldMappingStorage_1.fieldMappingStorage.saveConfiguration({
            name: body.name.trim(),
            description: body.description,
            projectId: body.projectId.trim(),
            projectName: body.projectName,
            isDefault: body.isDefault ?? false,
        }, body.mappings);
        res.status(201).json({
            success: true,
            data: config,
        });
    }
    catch (error) {
        console.error("Error creating field mapping configuration:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to create field mapping configuration",
        });
    }
};
exports.createFieldMappingConfig = createFieldMappingConfig;
/**
 * Update a field mapping configuration
 * PUT /api/field-mapping/configs/:id
 */
const updateFieldMappingConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
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
        const config = await fieldMappingStorage_1.fieldMappingStorage.updateConfiguration(id, {
            name: body.name?.trim(),
            description: body.description,
            projectName: body.projectName,
            isDefault: body.isDefault,
        }, body.mappings);
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
    }
    catch (error) {
        console.error("Error updating field mapping configuration:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to update field mapping configuration",
        });
    }
};
exports.updateFieldMappingConfig = updateFieldMappingConfig;
/**
 * Delete a field mapping configuration
 * DELETE /api/field-mapping/configs/:id
 */
const deleteFieldMappingConfig = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || typeof id !== "string") {
            res.status(400).json({
                success: false,
                error: "Configuration ID is required",
            });
            return;
        }
        const deleted = await fieldMappingStorage_1.fieldMappingStorage.deleteConfiguration(id);
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
    }
    catch (error) {
        console.error("Error deleting field mapping configuration:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to delete field mapping configuration",
        });
    }
};
exports.deleteFieldMappingConfig = deleteFieldMappingConfig;
/**
 * Get work item types for a project with their fields
 * GET /api/field-mapping/work-item-types?projectId={projectId}&configId={configId}
 */
const getWorkItemTypes = async (req, res) => {
    try {
        const projectId = req.query.projectId;
        const configId = req.query.configId;
        if (!projectId || typeof projectId !== "string" || projectId.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: "projectId query parameter is required and must be a non-empty string",
            });
            return;
        }
        // Get Azure DevOps client
        const client = await (0, azureDevOpsClientHelper_1.getAzureDevOpsClient)(configId);
        // Get work item types
        const workItemTypes = await client.getWorkItemTypes(projectId);
        // Get all fields
        const allFields = await client.getFields(projectId);
        // Build response with fields for each work item type
        // Get fields for each work item type individually to ensure accuracy
        const result = await Promise.all(workItemTypes.map(async (wit) => {
            // Get fields specifically for this work item type
            const fieldsForType = await client.getFieldsForWorkItemType(projectId, wit.name);
            const fields = fieldsForType.map((field) => ({
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
        }));
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error("Error fetching work item types:", error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message || "Failed to fetch work item types",
        });
    }
};
exports.getWorkItemTypes = getWorkItemTypes;
/**
 * Get available fields for a specific work item type
 * GET /api/field-mapping/fields?projectId={projectId}&workItemType={workItemType}&configId={configId}
 */
const getFieldsForWorkItemType = async (req, res) => {
    try {
        const projectId = req.query.projectId;
        const workItemType = req.query.workItemType;
        const configId = req.query.configId;
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
        const client = await (0, azureDevOpsClientHelper_1.getAzureDevOpsClient)(configId);
        // Get fields for the work item type
        const fields = await client.getFieldsForWorkItemType(projectId, workItemType);
        // Map to response format
        const result = fields.map((field) => ({
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
    }
    catch (error) {
        console.error("Error fetching fields for work item type:", error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message || "Failed to fetch fields for work item type",
        });
    }
};
exports.getFieldsForWorkItemType = getFieldsForWorkItemType;
//# sourceMappingURL=fieldMapping.js.map