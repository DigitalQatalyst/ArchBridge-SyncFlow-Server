import { AzureDevOpsClient } from "./azureDevOpsClient";
/**
 * Get an AzureDevOpsClient configured with a specific configuration
 * @param configId - Optional configuration ID. If not provided, uses active configuration or env vars
 * @returns Configured AzureDevOpsClient instance
 */
export declare function getAzureDevOpsClient(configId?: string): Promise<AzureDevOpsClient>;
//# sourceMappingURL=azureDevOpsClientHelper.d.ts.map