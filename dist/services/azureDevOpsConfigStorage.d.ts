import { AzureDevOpsConfiguration } from "../types/azureDevOps";
/**
 * Configuration Storage Service
 * Manages Azure DevOps API configurations stored in Supabase
 */
declare class AzureDevOpsConfigStorage {
    /**
     * Convert database row to AzureDevOpsConfiguration interface
     */
    private rowToConfig;
    /**
     * Convert AzureDevOpsConfiguration to database row format
     */
    private configToRow;
    /**
     * Check if a configuration with the same pat_token and name already exists
     */
    findDuplicateConfiguration(patToken: string, name: string): Promise<AzureDevOpsConfiguration | null>;
    /**
     * Save a new configuration
     */
    saveConfiguration(config: Omit<AzureDevOpsConfiguration, "id" | "createdAt" | "updatedAt">): Promise<AzureDevOpsConfiguration>;
    /**
     * Get all configurations
     */
    getAllConfigurations(): Promise<AzureDevOpsConfiguration[]>;
    /**
     * Get a configuration by ID
     */
    getConfigurationById(id: string): Promise<AzureDevOpsConfiguration | undefined>;
    /**
     * Get the active configuration
     */
    getActiveConfiguration(): Promise<AzureDevOpsConfiguration | undefined>;
    /**
     * Update a configuration
     */
    updateConfiguration(id: string, updates: Partial<Omit<AzureDevOpsConfiguration, "id" | "createdAt">>): Promise<AzureDevOpsConfiguration | null>;
    /**
     * Delete a configuration
     */
    deleteConfiguration(id: string): Promise<boolean>;
    /**
     * Set a configuration as active
     */
    setActiveConfiguration(id: string): Promise<AzureDevOpsConfiguration | null>;
}
export declare const azureDevOpsConfigStorage: AzureDevOpsConfigStorage;
export {};
//# sourceMappingURL=azureDevOpsConfigStorage.d.ts.map