"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateConfiguration = exports.deleteConfiguration = exports.updateConfiguration = exports.getActiveConfiguration = exports.getConfiguration = exports.listConfigurations = void 0;
const azureDevOpsConfigStorage_1 = require("../../services/azureDevOpsConfigStorage");
/**
 * Get all saved configurations
 * GET /api/azure-devops/configurations
 */
const listConfigurations = async (_req, res) => {
    try {
        const configs = await azureDevOpsConfigStorage_1.azureDevOpsConfigStorage.getAllConfigurations();
        // Don't expose the actual PAT token in the list
        const safeConfigs = configs.map(config => ({
            id: config.id,
            name: config.name,
            organization: config.organization,
            isActive: config.isActive,
            isTested: config.isTested,
            testPassed: config.testPassed,
            testError: config.testError,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
        }));
        res.json({
            success: true,
            data: safeConfigs,
            count: safeConfigs.length,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || "Failed to retrieve configurations",
        });
    }
};
exports.listConfigurations = listConfigurations;
/**
 * Get a specific configuration by ID
 * GET /api/azure-devops/configurations/:id
 */
const getConfiguration = async (req, res) => {
    try {
        const { id } = req.params;
        const config = await azureDevOpsConfigStorage_1.azureDevOpsConfigStorage.getConfigurationById(id);
        if (!config) {
            res.status(404).json({
                success: false,
                error: `Configuration with id ${id} not found`,
            });
            return;
        }
        // Don't expose the actual PAT token
        const safeConfig = {
            id: config.id,
            name: config.name,
            organization: config.organization,
            isActive: config.isActive,
            isTested: config.isTested,
            testPassed: config.testPassed,
            testError: config.testError,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
        };
        res.json({
            success: true,
            data: safeConfig,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || "Failed to retrieve configuration",
        });
    }
};
exports.getConfiguration = getConfiguration;
/**
 * Get the active configuration
 * GET /api/azure-devops/configurations/active
 */
const getActiveConfiguration = async (_req, res) => {
    try {
        const config = await azureDevOpsConfigStorage_1.azureDevOpsConfigStorage.getActiveConfiguration();
        if (!config) {
            res.status(404).json({
                success: false,
                error: "No active configuration found",
            });
            return;
        }
        // Don't expose the actual PAT token
        const safeConfig = {
            id: config.id,
            name: config.name,
            organization: config.organization,
            isActive: config.isActive,
            isTested: config.isTested,
            testPassed: config.testPassed,
            testError: config.testError,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
        };
        res.json({
            success: true,
            data: safeConfig,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || "Failed to retrieve active configuration",
        });
    }
};
exports.getActiveConfiguration = getActiveConfiguration;
/**
 * Update a configuration
 * PUT /api/azure-devops/configurations/:id
 */
const updateConfiguration = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, organization, isActive, patToken } = req.body;
        const updates = {};
        if (name !== undefined)
            updates.name = name;
        if (organization !== undefined)
            updates.organization = organization;
        if (isActive !== undefined)
            updates.isActive = isActive;
        if (patToken !== undefined) {
            updates.patToken = patToken;
            // If PAT token is updated, reset test status
            updates.isTested = false;
            updates.testPassed = false;
            updates.testError = null;
        }
        const updated = await azureDevOpsConfigStorage_1.azureDevOpsConfigStorage.updateConfiguration(id, updates);
        if (!updated) {
            res.status(404).json({
                success: false,
                error: `Configuration with id ${id} not found`,
            });
            return;
        }
        // Don't expose the actual PAT token
        const safeConfig = {
            id: updated.id,
            name: updated.name,
            organization: updated.organization,
            isActive: updated.isActive,
            isTested: updated.isTested,
            testPassed: updated.testPassed,
            testError: updated.testError,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
        res.json({
            success: true,
            message: "Configuration updated successfully",
            data: safeConfig,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || "Failed to update configuration",
        });
    }
};
exports.updateConfiguration = updateConfiguration;
/**
 * Delete a configuration
 * DELETE /api/azure-devops/configurations/:id
 */
const deleteConfiguration = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await azureDevOpsConfigStorage_1.azureDevOpsConfigStorage.deleteConfiguration(id);
        if (!deleted) {
            res.status(404).json({
                success: false,
                error: `Configuration with id ${id} not found`,
            });
            return;
        }
        res.json({
            success: true,
            message: "Configuration deleted successfully",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || "Failed to delete configuration",
        });
    }
};
exports.deleteConfiguration = deleteConfiguration;
/**
 * Set a configuration as active
 * POST /api/azure-devops/configurations/:id/activate
 */
const activateConfiguration = async (req, res) => {
    try {
        const { id } = req.params;
        const config = await azureDevOpsConfigStorage_1.azureDevOpsConfigStorage.getConfigurationById(id);
        if (!config) {
            res.status(404).json({
                success: false,
                error: `Configuration with id ${id} not found`,
            });
            return;
        }
        // Only allow activation if test has passed
        if (!config.testPassed) {
            res.status(400).json({
                success: false,
                error: "Configuration must pass the connection test before it can be activated",
            });
            return;
        }
        const activated = await azureDevOpsConfigStorage_1.azureDevOpsConfigStorage.setActiveConfiguration(id);
        if (!activated) {
            res.status(500).json({
                success: false,
                error: "Failed to activate configuration",
            });
            return;
        }
        // Don't expose the actual PAT token
        const safeConfig = {
            id: activated.id,
            name: activated.name,
            organization: activated.organization,
            isActive: activated.isActive,
            isTested: activated.isTested,
            testPassed: activated.testPassed,
            testError: activated.testError,
            createdAt: activated.createdAt,
            updatedAt: activated.updatedAt,
        };
        res.json({
            success: true,
            message: "Configuration activated successfully",
            data: safeConfig,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || "Failed to activate configuration",
        });
    }
};
exports.activateConfiguration = activateConfiguration;
//# sourceMappingURL=azureDevOpsConfigurations.js.map