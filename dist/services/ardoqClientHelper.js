"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArdoqClient = getArdoqClient;
const ardoqClient_1 = require("./ardoqClient");
const ardoqClient_2 = require("./ardoqClient");
const configStorage_1 = require("./configStorage");
/**
 * Get an ArdoqClient configured with a specific configuration
 * @param configId - Optional configuration ID. If not provided, uses active configuration or env vars
 * @returns Configured ArdoqClient instance
 */
async function getArdoqClient(configId) {
    if (configId) {
        const config = await configStorage_1.configStorage.getConfigurationById(configId);
        if (!config) {
            throw new Error(`Configuration with id ${configId} not found`);
        }
        if (!config.testPassed) {
            throw new Error(`Configuration "${config.name}" has not passed the connection test. Please test and update the configuration before using it.`);
        }
        return ardoqClient_1.ArdoqClient.createWithConfig({
            apiToken: config.apiToken,
            apiHost: config.apiHost,
            orgLabel: config.orgLabel,
        });
    }
    // Try to use active configuration (only if it passed the test)
    const activeConfig = await configStorage_1.configStorage.getActiveConfiguration();
    if (activeConfig && activeConfig.testPassed) {
        return ardoqClient_1.ArdoqClient.createWithConfig({
            apiToken: activeConfig.apiToken,
            apiHost: activeConfig.apiHost,
            orgLabel: activeConfig.orgLabel,
        });
    }
    // If active config exists but hasn't passed test, throw error
    if (activeConfig && !activeConfig.testPassed) {
        throw new Error(`Active configuration "${activeConfig.name}" has not passed the connection test. Please test and update the configuration before using it.`);
    }
    // Fall back to singleton (which uses env vars)
    return ardoqClient_2.ardoqClient;
}
//# sourceMappingURL=ardoqClientHelper.js.map