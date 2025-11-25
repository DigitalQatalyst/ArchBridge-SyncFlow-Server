"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnectionWithConfig = exports.createConfiguration = void 0;
const ardoqClient_1 = require("../../services/ardoqClient");
const configStorage_1 = require("../../services/configStorage");
/**
 * Create a new Ardoq configuration
 * Automatically tests the connection during creation
 * Configuration can be saved even if test fails, but cannot be used until test passes
 * POST /api/ardoq/configurations
 */
const createConfiguration = async (req, res) => {
    try {
        const { apiToken, apiHost, orgLabel, name, setActive, } = req.body;
        // Validation
        if (!apiToken ||
            typeof apiToken !== "string" ||
            apiToken.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: "apiToken is required and must be a non-empty string",
            });
            return;
        }
        if (!name || typeof name !== "string" || name.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: "name is required and must be a non-empty string",
            });
            return;
        }
        if (apiHost && typeof apiHost !== "string") {
            res.status(400).json({
                success: false,
                error: "apiHost must be a string",
            });
            return;
        }
        if (orgLabel && typeof orgLabel !== "string") {
            res.status(400).json({
                success: false,
                error: "orgLabel must be a string",
            });
            return;
        }
        // Validate API host format if provided
        const host = apiHost || "https://app.ardoq.com";
        try {
            new URL(host);
        }
        catch {
            res.status(400).json({
                success: false,
                error: "apiHost must be a valid URL",
            });
            return;
        }
        // Test connection automatically
        let testPassed = false;
        let testError;
        let testData = null;
        try {
            const testClient = ardoqClient_1.ArdoqClient.createWithConfig({
                apiToken: apiToken.trim(),
                apiHost: host,
                orgLabel: orgLabel?.trim(),
            });
            testData = await testClient.get("/api/v2/me");
            testPassed = true;
        }
        catch (error) {
            testPassed = false;
            testError = error.message || "Connection test failed";
            // Continue to save configuration even if test fails
        }
        // Check for duplicate configuration before saving
        const duplicate = await configStorage_1.configStorage.findDuplicateConfiguration(apiToken.trim(), name.trim());
        if (duplicate) {
            res.status(409).json({
                success: false,
                error: "A configuration with the same apiToken and name already exists",
                details: {
                    existingConfigId: duplicate.id,
                    existingConfigName: duplicate.name,
                    message: `Configuration "${duplicate.name}" (ID: ${duplicate.id}) already uses this apiToken and name combination. Please use the existing configuration or update it instead.`,
                },
            });
            return;
        }
        // Save configuration (always save, even if test failed)
        let savedConfig;
        try {
            savedConfig = await configStorage_1.configStorage.saveConfiguration({
                name: name.trim(),
                apiToken: apiToken.trim(),
                apiHost: host,
                orgLabel: orgLabel?.trim(),
                isActive: setActive ?? false,
                isTested: true,
                testPassed,
                testError,
            });
        }
        catch (error) {
            // Handle duplicate error from database constraint
            if (error.message?.includes("already exists") ||
                error.message?.includes("duplicate") ||
                error.message?.includes("unique")) {
                res.status(409).json({
                    success: false,
                    error: "A configuration with the same apiToken and name already exists",
                    details: error.message,
                });
                return;
            }
            throw error; // Re-throw other errors
        }
        // If setActive is true, ensure it's set (but only if test passed)
        if (setActive && testPassed) {
            if (!savedConfig.isActive) {
                const activated = await configStorage_1.configStorage.setActiveConfiguration(savedConfig.id);
                if (activated) {
                    savedConfig.isActive = true;
                }
            }
        }
        else if (setActive && !testPassed) {
            // If user tried to set active but test failed, don't activate
            // Update to set isActive to false
            await configStorage_1.configStorage.updateConfiguration(savedConfig.id, {
                isActive: false,
            });
            savedConfig.isActive = false;
        }
        const response = {
            success: true,
            message: testPassed
                ? "Configuration created and connection test passed"
                : "Configuration created but connection test failed",
            data: {
                configuration: {
                    id: savedConfig.id,
                    name: savedConfig.name,
                    apiHost: savedConfig.apiHost,
                    orgLabel: savedConfig.orgLabel,
                    isActive: savedConfig.isActive,
                    isTested: savedConfig.isTested,
                    testPassed: savedConfig.testPassed,
                    testError: savedConfig.testError,
                    createdAt: savedConfig.createdAt,
                },
                testResult: testPassed
                    ? {
                        success: true,
                        user: testData?.user,
                        organization: testData?.org,
                        timestamp: new Date().toISOString(),
                    }
                    : {
                        success: false,
                        error: testError,
                        timestamp: new Date().toISOString(),
                    },
            },
        };
        // Return 201 Created status (configuration is saved regardless of test result)
        res.status(201).json(response);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || "Failed to create configuration",
        });
    }
};
exports.createConfiguration = createConfiguration;
/**
 * Test connection using existing saved configuration and update test status
 * GET /api/ardoq/test-connection?configId=xxx
 * Query params: configId (optional) - If provided, uses that configuration. If omitted, uses active configuration.
 */
const testConnectionWithConfig = async (req, res) => {
    try {
        const configId = req.query.configId;
        let config;
        if (configId) {
            config = await configStorage_1.configStorage.getConfigurationById(configId);
            if (!config) {
                res.status(404).json({
                    success: false,
                    error: `Configuration with id ${configId} not found`,
                });
                return;
            }
        }
        else {
            config = await configStorage_1.configStorage.getActiveConfiguration();
            if (!config) {
                res.status(400).json({
                    success: false,
                    error: "No active configuration found. Please provide a configId or set an active configuration.",
                });
                return;
            }
        }
        // Create a client with the saved configuration
        const testClient = ardoqClient_1.ArdoqClient.createWithConfig({
            apiToken: config.apiToken,
            apiHost: config.apiHost,
            orgLabel: config.orgLabel,
        });
        // Test connection
        let testPassed = false;
        let testError;
        let testData = null;
        try {
            testData = await testClient.get("/api/v2/me");
            testPassed = true;
        }
        catch (error) {
            testPassed = false;
            testError = error.message || "Connection test failed";
        }
        // Update configuration with test results
        const updatedConfig = await configStorage_1.configStorage.updateConfiguration(config.id, {
            isTested: true,
            testPassed,
            testError,
        });
        if (!updatedConfig) {
            res.status(500).json({
                success: false,
                error: "Failed to update configuration test status",
            });
            return;
        }
        res.json({
            success: true,
            message: testPassed
                ? "Ardoq API connection test passed"
                : "Ardoq API connection test failed",
            data: {
                user: testData?.user,
                organization: testData?.org,
                timestamp: new Date().toISOString(),
            },
            configuration: {
                id: updatedConfig.id,
                name: updatedConfig.name,
                apiHost: updatedConfig.apiHost,
                orgLabel: updatedConfig.orgLabel,
                isActive: updatedConfig.isActive,
                isTested: updatedConfig.isTested,
                testPassed: updatedConfig.testPassed,
                testError: updatedConfig.testError,
            },
        });
    }
    catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message || "Failed to test connection",
            details: error.statusCode
                ? `HTTP ${error.statusCode}: ${error.message || "Connection failed"}`
                : "Connection error",
        });
    }
};
exports.testConnectionWithConfig = testConnectionWithConfig;
//# sourceMappingURL=ardoqTestConnections.js.map