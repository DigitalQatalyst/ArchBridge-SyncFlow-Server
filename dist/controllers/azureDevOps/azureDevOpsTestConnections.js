"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnectionWithConfig = exports.createConfiguration = void 0;
const azureDevOpsClient_1 = require("../../services/azureDevOpsClient");
const azureDevOpsConfigStorage_1 = require("../../services/azureDevOpsConfigStorage");
/**
 * Create a new Azure DevOps configuration
 * Automatically tests the connection during creation
 * Configuration can be saved even if test fails, but cannot be used until test passes
 * POST /api/azure-devops/configurations
 */
const createConfiguration = async (req, res) => {
    try {
        const { patToken, organization, name, setActive, } = req.body;
        // Validation
        if (!patToken ||
            typeof patToken !== "string" ||
            patToken.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: "patToken is required and must be a non-empty string",
            });
            return;
        }
        if (!organization ||
            typeof organization !== "string" ||
            organization.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: "organization is required and must be a non-empty string",
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
        // Test connection automatically
        let testPassed = false;
        let testError;
        let testData = null;
        try {
            const testClient = azureDevOpsClient_1.AzureDevOpsClient.createWithConfig({
                patToken: patToken.trim(),
                organization: organization.trim(),
            });
            testData = await testClient.get("/_apis/projects?api-version=7.1");
            testPassed = true;
            testError = null;
        }
        catch (error) {
            testPassed = false;
            testError = error.message || "Connection test failed";
            // Continue to save configuration even if test fails
        }
        // Check for duplicate configuration before saving
        const duplicate = await azureDevOpsConfigStorage_1.azureDevOpsConfigStorage.findDuplicateConfiguration(patToken.trim(), name.trim());
        if (duplicate) {
            res.status(409).json({
                success: false,
                error: "A configuration with the same patToken and name already exists",
                details: {
                    existingConfigId: duplicate.id,
                    existingConfigName: duplicate.name,
                    message: `Configuration "${duplicate.name}" (ID: ${duplicate.id}) already uses this patToken and name combination. Please use the existing configuration or update it instead.`,
                },
            });
            return;
        }
        // Save configuration (always save, even if test failed)
        let savedConfig;
        try {
            savedConfig = await azureDevOpsConfigStorage_1.azureDevOpsConfigStorage.saveConfiguration({
                name: name.trim(),
                patToken: patToken.trim(),
                organization: organization.trim(),
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
                    error: "A configuration with the same patToken and name already exists",
                    details: error.message,
                });
                return;
            }
            throw error; // Re-throw other errors
        }
        // If setActive is true, ensure it's set (but only if test passed)
        if (setActive && testPassed) {
            if (!savedConfig.isActive) {
                const activated = await azureDevOpsConfigStorage_1.azureDevOpsConfigStorage.setActiveConfiguration(savedConfig.id);
                if (activated) {
                    savedConfig.isActive = true;
                }
            }
        }
        else if (setActive && !testPassed) {
            // If user tried to set active but test failed, don't activate
            // Update to set isActive to false
            await azureDevOpsConfigStorage_1.azureDevOpsConfigStorage.updateConfiguration(savedConfig.id, {
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
                    organization: savedConfig.organization,
                    isActive: savedConfig.isActive,
                    isTested: savedConfig.isTested,
                    testPassed: savedConfig.testPassed,
                    testError: savedConfig.testError,
                    createdAt: savedConfig.createdAt,
                },
                testResult: testPassed
                    ? {
                        success: true,
                        projects: testData?.value || testData,
                        projectCount: testData?.count || (Array.isArray(testData?.value) ? testData.value.length : 0),
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
 * GET /api/azure-devops/test-connection?configId=xxx
 * Query params: configId (optional) - If provided, uses that configuration. If omitted, uses active configuration.
 */
const testConnectionWithConfig = async (req, res) => {
    try {
        const configId = req.query.configId;
        let config;
        if (configId) {
            config = await azureDevOpsConfigStorage_1.azureDevOpsConfigStorage.getConfigurationById(configId);
            if (!config) {
                res.status(404).json({
                    success: false,
                    error: `Configuration with id ${configId} not found`,
                });
                return;
            }
        }
        else {
            config = await azureDevOpsConfigStorage_1.azureDevOpsConfigStorage.getActiveConfiguration();
            if (!config) {
                res.status(400).json({
                    success: false,
                    error: "No active configuration found. Please provide a configId or set an active configuration.",
                });
                return;
            }
        }
        // Create a client with the saved configuration
        const testClient = azureDevOpsClient_1.AzureDevOpsClient.createWithConfig({
            patToken: config.patToken,
            organization: config.organization,
        });
        // Test connection
        let testPassed = false;
        let testError;
        let testData = null;
        try {
            testData = await testClient.get("/_apis/projects?api-version=7.1");
            testPassed = true;
            testError = null;
        }
        catch (error) {
            testPassed = false;
            testError = error.message || "Connection test failed";
        }
        // Update configuration with test results
        const updatedConfig = await azureDevOpsConfigStorage_1.azureDevOpsConfigStorage.updateConfiguration(config.id, {
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
                ? "Azure DevOps API connection test passed"
                : "Azure DevOps API connection test failed",
            data: {
                projects: testData?.value || testData,
                projectCount: testData?.count || (Array.isArray(testData?.value) ? testData.value.length : 0),
                timestamp: new Date().toISOString(),
            },
            configuration: {
                id: updatedConfig.id,
                name: updatedConfig.name,
                organization: updatedConfig.organization,
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
//# sourceMappingURL=azureDevOpsTestConnections.js.map