import { FieldMappingConfig, FieldMapping, WorkItemType } from "../types/fieldMapping";
/**
 * Field Mapping Storage Service
 * Manages field mapping configurations and mappings stored in Supabase
 */
declare class FieldMappingStorage {
    /**
     * Convert database row to FieldMappingConfig interface
     */
    private rowToConfig;
    /**
     * Convert database row to FieldMapping interface
     */
    private rowToMapping;
    /**
     * Convert FieldMappingConfig to database row format
     */
    private configToRow;
    /**
     * Save a new field mapping configuration
     */
    saveConfiguration(config: Omit<FieldMappingConfig, "id" | "createdAt" | "updatedAt" | "mappings">, mappings: Omit<FieldMapping, "id">[]): Promise<FieldMappingConfig>;
    /**
     * Get a configuration by ID
     */
    getConfigurationById(id: string): Promise<FieldMappingConfig | undefined>;
    /**
     * Get all configurations for a project
     */
    getConfigurationsByProject(projectId: string): Promise<FieldMappingConfig[]>;
    /**
     * Get the default configuration for a project
     */
    getDefaultConfiguration(projectId: string): Promise<FieldMappingConfig | undefined>;
    /**
     * Update a configuration
     */
    updateConfiguration(id: string, updates: Partial<Omit<FieldMappingConfig, "id" | "createdAt" | "updatedAt" | "mappings">>, mappings?: Omit<FieldMapping, "id">[]): Promise<FieldMappingConfig | null>;
    /**
     * Delete a configuration (cascades to mappings)
     */
    deleteConfiguration(id: string): Promise<boolean>;
    /**
     * Get mappings for a configuration
     */
    getMappingsByConfig(configId: string): Promise<FieldMapping[]>;
    /**
     * Get mappings for a configuration filtered by work item type
     */
    getMappingsByConfigAndType(configId: string, workItemType: WorkItemType): Promise<FieldMapping[]>;
}
export declare const fieldMappingStorage: FieldMappingStorage;
export {};
//# sourceMappingURL=fieldMappingStorage.d.ts.map