import { Component } from "../lib/buildComponentHierarchy";
import { FieldMappingConfig, FieldMapping, WorkItemType } from "../types/fieldMapping";
/**
 * Field Mapping Engine
 * Transforms Ardoq component fields to Azure DevOps work item fields
 */
export declare class FieldMappingEngine {
    /**
     * Map Ardoq component type to work item type
     */
    private mapComponentTypeToWorkItemType;
    /**
     * Load field mapping configuration or return defaults
     */
    loadConfiguration(configId: string | undefined, projectId: string): Promise<FieldMappingConfig | null>;
    /**
     * Get default field mappings
     */
    getDefaultMappings(): Record<WorkItemType, FieldMapping[]>;
    /**
     * Apply field mappings to transform Ardoq component to Azure DevOps patch document
     */
    applyMappings(component: Component, workItemType: WorkItemType, config: FieldMappingConfig | null, organization: string, parentId?: number): Promise<any[]>;
    /**
     * Get field value from component, handling special cases
     */
    private getFieldValue;
    /**
     * Transform field value based on field type and mapping
     */
    private transformField;
    /**
     * Build Feature description by concatenating description with purpose, input, output, approach
     */
    private buildFeatureDescription;
    /**
     * Convert priority value to Azure DevOps priority number
     */
    private convertPriority;
    /**
     * Convert tags value to comma-separated string
     */
    private convertTags;
    /**
     * Convert date value to ISO 8601 format
     */
    private convertDate;
}
export declare const fieldMappingEngine: FieldMappingEngine;
//# sourceMappingURL=fieldMappingEngine.d.ts.map