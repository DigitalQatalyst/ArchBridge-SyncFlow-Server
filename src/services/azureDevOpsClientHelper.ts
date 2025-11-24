import { AzureDevOpsClient } from "./azureDevOpsClient";
import { azureDevOpsClient } from "./azureDevOpsClient";
import { azureDevOpsConfigStorage } from "./azureDevOpsConfigStorage";

/**
 * Get an AzureDevOpsClient configured with a specific configuration
 * @param configId - Optional configuration ID. If not provided, uses active configuration or env vars
 * @returns Configured AzureDevOpsClient instance
 */
export async function getAzureDevOpsClient(configId?: string): Promise<AzureDevOpsClient> {
  if (configId) {
    const config = await azureDevOpsConfigStorage.getConfigurationById(configId);
    if (!config) {
      throw new Error(`Configuration with id ${configId} not found`);
    }
    if (!config.testPassed) {
      throw new Error(
        `Configuration "${config.name}" has not passed the connection test. Please test and update the configuration before using it.`
      );
    }
    return AzureDevOpsClient.createWithConfig({
      patToken: config.patToken,
      organization: config.organization,
    });
  }

  // Try to use active configuration (only if it passed the test)
  const activeConfig = await azureDevOpsConfigStorage.getActiveConfiguration();
  if (activeConfig && activeConfig.testPassed) {
    return AzureDevOpsClient.createWithConfig({
      patToken: activeConfig.patToken,
      organization: activeConfig.organization,
    });
  }
  
  // If active config exists but hasn't passed test, throw error
  if (activeConfig && !activeConfig.testPassed) {
    throw new Error(
      `Active configuration "${activeConfig.name}" has not passed the connection test. Please test and update the configuration before using it.`
    );
  }

  // Fall back to singleton (which uses env vars)
  return azureDevOpsClient;
}

