"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateConfiguration = exports.deleteConfiguration = exports.updateConfiguration = exports.getActiveConfiguration = exports.getConfiguration = exports.listConfigurations = void 0;
const configStorage_1 = require("../../services/configStorage");
/**
 * Get all saved configurations
 * GET /api/ardoq/configurations
 */
const listConfigurations = async (_req, res) => {
    try {
        const configs = await configStorage_1.configStorage.getAllConfigurations();
        // Don't expose the actual API token in the list
        const safeConfigs = configs.map(config => ({
            id: config.id,
            name: config.name,
            apiHost: config.apiHost,
            orgLabel: config.orgLabel,
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
 * GET /api/ardoq/configurations/:id
 */
const getConfiguration = async (req, res) => {
    try {
        const { id } = req.params;
        const config = await configStorage_1.configStorage.getConfigurationById(id);
        if (!config) {
            res.status(404).json({
                success: false,
                error: `Configuration with id ${id} not found`,
            });
            return;
        }
        // Don't expose the actual API token
        const safeConfig = {
            id: config.id,
            name: config.name,
            apiHost: config.apiHost,
            orgLabel: config.orgLabel,
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
 * GET /api/ardoq/configurations/active
 */
const getActiveConfiguration = async (_req, res) => {
    try {
        const config = await configStorage_1.configStorage.getActiveConfiguration();
        if (!config) {
            res.status(404).json({
                success: false,
                error: "No active configuration found",
            });
            return;
        }
        // Don't expose the actual API token
        const safeConfig = {
            id: config.id,
            name: config.name,
            apiHost: config.apiHost,
            orgLabel: config.orgLabel,
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
 * PUT /api/ardoq/configurations/:id
 */
const updateConfiguration = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, apiHost, orgLabel, isActive, apiToken } = req.body;
        const updates = {};
        if (name !== undefined)
            updates.name = name;
        if (apiHost !== undefined)
            updates.apiHost = apiHost;
        if (orgLabel !== undefined)
            updates.orgLabel = orgLabel;
        if (isActive !== undefined)
            updates.isActive = isActive;
        if (apiToken !== undefined) {
            updates.apiToken = apiToken;
            // If API token is updated, reset test status
            updates.isTested = false;
            updates.testPassed = false;
            updates.testError = null;
        }
        const updated = await configStorage_1.configStorage.updateConfiguration(id, updates);
        if (!updated) {
            res.status(404).json({
                success: false,
                error: `Configuration with id ${id} not found`,
            });
            return;
        }
        // Don't expose the actual API token
        const safeConfig = {
            id: updated.id,
            name: updated.name,
            apiHost: updated.apiHost,
            orgLabel: updated.orgLabel,
            isActive: updated.isActive,
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
 * DELETE /api/ardoq/configurations/:id
 */
const deleteConfiguration = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await configStorage_1.configStorage.deleteConfiguration(id);
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
 * POST /api/ardoq/configurations/:id/activate
 */
const activateConfiguration = async (req, res) => {
    try {
        const { id } = req.params;
        const config = await configStorage_1.configStorage.setActiveConfiguration(id);
        if (!config) {
            res.status(404).json({
                success: false,
                error: `Configuration with id ${id} not found`,
            });
            return;
        }
        // Don't expose the actual API token
        const safeConfig = {
            id: config.id,
            name: config.name,
            apiHost: config.apiHost,
            orgLabel: config.orgLabel,
            isActive: config.isActive,
            isTested: config.isTested,
            testPassed: config.testPassed,
            testError: config.testError,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
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
//# sourceMappingURL=ardoqConfigurations.js.map