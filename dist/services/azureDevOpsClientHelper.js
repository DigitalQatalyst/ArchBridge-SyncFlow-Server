"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAzureDevOpsClient = getAzureDevOpsClient;
const azureDevOpsClient_1 = require("./azureDevOpsClient");
const azureDevOpsClient_2 = require("./azureDevOpsClient");
const azureDevOpsConfigStorage_1 = require("./azureDevOpsConfigStorage");
/**
 * Get an AzureDevOpsClient configured with a specific configuration
 * @param configId - Optional configuration ID. If not provided, uses active configuration or env vars
 * @returns Configured AzureDevOpsClient instance
 */
async function getAzureDevOpsClient(configId) {
    if (configId) {
        const config = await azureDevOpsConfigStorage_1.azureDevOpsConfigStorage.getConfigurationById(configId);
        if (!config) {
            throw new Error(`Configuration with id ${configId} not found`);
        }
        if (!config.testPassed) {
            throw new Error(`Configuration "${config.name}" has not passed the connection test. Please test and update the configuration before using it.`);
        }
        return azureDevOpsClient_1.AzureDevOpsClient.createWithConfig({
            patToken: config.patToken,
            organization: config.organization,
        });
    }
    // Try to use active configuration (only if it passed the test)
    const activeConfig = await azureDevOpsConfigStorage_1.azureDevOpsConfigStorage.getActiveConfiguration();
    if (activeConfig && activeConfig.testPassed) {
        return azureDevOpsClient_1.AzureDevOpsClient.createWithConfig({
            patToken: activeConfig.patToken,
            organization: activeConfig.organization,
        });
    }
    // If active config exists but hasn't passed test, throw error
    if (activeConfig && !activeConfig.testPassed) {
        throw new Error(`Active configuration "${activeConfig.name}" has not passed the connection test. Please test and update the configuration before using it.`);
    }
    // Fall back to singleton (which uses env vars)
    return azureDevOpsClient_2.azureDevOpsClient;
}
//# sourceMappingURL=azureDevOpsClientHelper.js.map