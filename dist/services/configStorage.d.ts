export interface ArdoqConfiguration {
    id: string;
    name: string;
    apiToken: string;
    apiHost: string;
    orgLabel?: string;
    createdAt: string;
    updatedAt: string;
    isActive?: boolean;
    isTested?: boolean;
    testPassed?: boolean;
    testError?: string;
}
/**
 * Configuration Storage Service
 * Manages Ardoq API configurations stored in Supabase
 */
declare class ConfigStorage {
    /**
     * Convert database row to ArdoqConfiguration interface
     */
    private rowToConfig;
    /**
     * Convert ArdoqConfiguration to database row format
     */
    private configToRow;
    /**
     * Check if a configuration with the same api_token and name already exists
     */
    findDuplicateConfiguration(apiToken: string, name: string): Promise<ArdoqConfiguration | null>;
    /**
     * Save a new configuration
     */
    saveConfiguration(config: Omit<ArdoqConfiguration, "id" | "createdAt" | "updatedAt">): Promise<ArdoqConfiguration>;
    /**
     * Get all configurations
     */
    getAllConfigurations(): Promise<ArdoqConfiguration[]>;
    /**
     * Get a configuration by ID
     */
    getConfigurationById(id: string): Promise<ArdoqConfiguration | undefined>;
    /**
     * Get the active configuration
     */
    getActiveConfiguration(): Promise<ArdoqConfiguration | undefined>;
    /**
     * Update a configuration
     */
    updateConfiguration(id: string, updates: Partial<Omit<ArdoqConfiguration, "id" | "createdAt">>): Promise<ArdoqConfiguration | null>;
    /**
     * Delete a configuration
     */
    deleteConfiguration(id: string): Promise<boolean>;
    /**
     * Set a configuration as active
     */
    setActiveConfiguration(id: string): Promise<ArdoqConfiguration | null>;
}
export declare const configStorage: ConfigStorage;
export {};
//# sourceMappingURL=configStorage.d.ts.map