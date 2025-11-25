import { Component } from "../lib/buildComponentHierarchy";
import {
  FieldMappingConfig,
  FieldMapping,
  WorkItemType,
} from "../types/fieldMapping";
import { fieldMappingStorage } from "./fieldMappingStorage";

/**
 * Field Mapping Engine
 * Transforms Ardoq component fields to Azure DevOps work item fields
 */
export class FieldMappingEngine {
  /**
   * Map Ardoq component type to work item type
   */
  private mapComponentTypeToWorkItemType(
    componentType: string
  ): WorkItemType | null {
    if (componentType === "Epic") return "epic";
    if (componentType === "Feature") return "feature";
    if (componentType === "User Story") return "user_story";
    return null;
  }

  /**
   * Load field mapping configuration or return defaults
   */
  async loadConfiguration(
    configId: string | undefined,
    projectId: string
  ): Promise<FieldMappingConfig | null> {
    if (configId) {
      try {
        const config = await fieldMappingStorage.getConfigurationById(configId);
        if (config) {
          return config;
        }
        console.warn(
          `Field mapping configuration ${configId} not found, using default mappings`
        );
      } catch (error) {
        console.error(
          `Error loading field mapping configuration ${configId}:`,
          error
        );
        console.warn("Falling back to default mappings");
      }
    } else {
      // Try to get default configuration for project
      try {
        const defaultConfig = await fieldMappingStorage.getDefaultConfiguration(
          projectId
        );
        if (defaultConfig) {
          return defaultConfig;
        }
      } catch (error) {
        console.error(
          `Error loading default field mapping configuration for project ${projectId}:`,
          error
        );
      }
    }

    // Return null to indicate using default mappings
    return null;
  }

  /**
   * Get default field mappings
   */
  getDefaultMappings(): Record<WorkItemType, FieldMapping[]> {
    return {
      epic: [
        {
          ardoqField: "description",
          azureDevOpsField: "System.Description",
          workItemType: "epic",
        },
        {
          ardoqField: "priority",
          azureDevOpsField: "Microsoft.VSTS.Common.Priority",
          workItemType: "epic",
        },
        {
          ardoqField: "tags",
          azureDevOpsField: "System.Tags",
          workItemType: "epic",
        },
        {
          ardoqField: "lastUpdatedBy",
          azureDevOpsField: "System.ChangedBy",
          workItemType: "epic",
        },
        {
          ardoqField: "lastUpdatedDate",
          azureDevOpsField: "System.ChangedDate",
          workItemType: "epic",
        },
      ],
      feature: [
        {
          ardoqField: "description",
          azureDevOpsField: "System.Description",
          workItemType: "feature",
        },
        {
          ardoqField: "tags",
          azureDevOpsField: "System.Tags",
          workItemType: "feature",
        },
        {
          ardoqField: "priority",
          azureDevOpsField: "Microsoft.VSTS.Common.Priority",
          workItemType: "feature",
        },
      ],
      user_story: [
        {
          ardoqField: "description",
          azureDevOpsField: "System.Description",
          workItemType: "user_story",
        },
        {
          ardoqField: "acceptanceCriteria",
          azureDevOpsField: "Microsoft.VSTS.Common.AcceptanceCriteria",
          workItemType: "user_story",
        },
        {
          ardoqField: "priority",
          azureDevOpsField: "Microsoft.VSTS.Common.Priority",
          workItemType: "user_story",
        },
        {
          ardoqField: "classification",
          azureDevOpsField: "Microsoft.VSTS.Common.Category",
          workItemType: "user_story",
        },
        {
          ardoqField: "risk",
          azureDevOpsField: "Custom.Risk",
          workItemType: "user_story",
        },
        {
          ardoqField: "tags",
          azureDevOpsField: "System.Tags",
          workItemType: "user_story",
        },
      ],
    };
  }

  /**
   * Apply field mappings to transform Ardoq component to Azure DevOps patch document
   */
  async applyMappings(
    component: Component,
    workItemType: WorkItemType,
    config: FieldMappingConfig | null,
    organization: string,
    parentId?: number
  ): Promise<any[]> {
    const patchDocument: any[] = [];

    // Always add title (required field)
    patchDocument.push({
      op: "add",
      path: "/fields/System.Title",
      value: component.name || "Untitled",
    });

    // Get mappings for this work item type
    const mappings = config
      ? config.mappings.filter((m) => m.workItemType === workItemType)
      : this.getDefaultMappings()[workItemType];

    // Apply each mapping
    for (const mapping of mappings) {
      try {
        const value = this.getFieldValue(component, mapping.ardoqField, workItemType);
        
        if (value === undefined || value === null) {
          continue; // Skip if field doesn't exist or is null
        }

        const transformedValue = this.transformField(
          value,
          mapping.ardoqField,
          mapping.azureDevOpsField,
          workItemType
        );

        if (transformedValue !== undefined && transformedValue !== null) {
          patchDocument.push({
            op: "add",
            path: `/fields/${mapping.azureDevOpsField}`,
            value: transformedValue,
          });
        }
      } catch (error) {
        console.warn(
          `Failed to map field ${mapping.ardoqField} to ${mapping.azureDevOpsField}:`,
          error
        );
        // Continue with other fields
      }
    }

    // Add parent-child relationship if parent exists
    if (parentId) {
      patchDocument.push({
        op: "add",
        path: "/relations/-",
        value: {
          rel: "System.LinkTypes.Hierarchy-Reverse",
          url: `https://dev.azure.com/${organization}/_apis/wit/workitems/${parentId}`,
        },
      });
    }

    return patchDocument;
  }

  /**
   * Get field value from component, handling special cases
   */
  private getFieldValue(
    component: Component,
    ardoqField: string,
    workItemType: WorkItemType
  ): any {
    // Special handling for Feature description
    if (workItemType === "feature" && ardoqField === "description") {
      return this.buildFeatureDescription(component);
    }

    // Get value from component (supports nested paths with dot notation)
    const parts = ardoqField.split(".");
    let value: any = component;
    
    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Transform field value based on field type and mapping
   */
  private transformField(
    value: any,
    ardoqField: string,
    azureDevOpsField: string,
    workItemType: WorkItemType
  ): any {
    // Priority conversion
    if (azureDevOpsField === "Microsoft.VSTS.Common.Priority") {
      return this.convertPriority(value, workItemType);
    }

    // Tags conversion
    if (azureDevOpsField === "System.Tags") {
      return this.convertTags(value);
    }

    // Date conversion
    if (
      azureDevOpsField === "System.ChangedDate" ||
      azureDevOpsField.includes("Date")
    ) {
      return this.convertDate(value);
    }

    // IdentityRef conversion (for ChangedBy, AssignedTo, etc.)
    if (
      azureDevOpsField === "System.ChangedBy" ||
      azureDevOpsField === "System.AssignedTo"
    ) {
      // Azure DevOps expects IdentityRef format, but we'll pass as string
      // The API may handle conversion, or we may need to look up the user
      return typeof value === "string" ? value : String(value);
    }

    // Risk conversion (1=high, 2=med, 3=low)
    if (azureDevOpsField === "Custom.Risk" && workItemType === "user_story") {
      if (typeof value === "number") {
        if (value === 1) return "High";
        if (value === 2) return "Medium";
        if (value === 3) return "Low";
      }
      return String(value);
    }

    // Default: return as-is or convert to string
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value);
    }

    return value;
  }

  /**
   * Build Feature description by concatenating description with purpose, input, output, approach
   */
  private buildFeatureDescription(feature: Component): string {
    const parts: string[] = [];

    // Add main description/context
    const description = feature.description || feature.context || "";
    if (description) {
      parts.push(description);
    }

    // Add purpose, input, output, approach sections
    const sections: Array<{ label: string; field: string }> = [
      { label: "Purpose", field: "purpose" },
      { label: "Input", field: "input" },
      { label: "Output (Definition of Done)", field: "output" },
      { label: "Approach", field: "approach" },
    ];

    const sectionParts: string[] = [];
    for (const section of sections) {
      const value = feature[section.field];
      if (value !== undefined && value !== null && value !== "") {
        sectionParts.push(`${section.label}: ${String(value)}`);
      }
    }

    if (sectionParts.length > 0) {
      if (parts.length > 0) {
        parts.push(""); // Add blank line separator
      }
      parts.push(...sectionParts);
    }

    return parts.join("\n");
  }

  /**
   * Convert priority value to Azure DevOps priority number
   */
  private convertPriority(value: any, workItemType: WorkItemType): number {
    // If already a number, validate and return
    if (typeof value === "number") {
      if (workItemType === "user_story") {
        // User Story priority: 1-4 maps to Azure DevOps priority scale
        // 1=Critical, 2=High, 3=Medium, 4=Low
        if (value >= 1 && value <= 4) {
          return value;
        }
      } else {
        // For Epic and Feature, use as-is if in valid range (1-4)
        if (value >= 1 && value <= 4) {
          return value;
        }
      }
    }

    // Try to parse string values
    if (typeof value === "string") {
      const lower = value.toLowerCase().trim();
      
      // Map common priority strings
      if (lower.includes("critical") || lower === "1") return 1;
      if (lower.includes("high") || lower === "2") return 2;
      if (lower.includes("medium") || lower.includes("med") || lower === "3")
        return 3;
      if (lower.includes("low") || lower === "4") return 4;
      
      // Try to parse as number
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 4) {
        return parsed;
      }
    }

    // Default to medium priority
    console.warn(
      `Unable to convert priority value "${value}" to Azure DevOps priority, using default 3 (Medium)`
    );
    return 3;
  }

  /**
   * Convert tags value to comma-separated string
   */
  private convertTags(value: any): string {
    if (Array.isArray(value)) {
      return value.filter((tag) => tag !== null && tag !== undefined).join(", ");
    }
    if (typeof value === "string") {
      return value;
    }
    return String(value || "");
  }

  /**
   * Convert date value to ISO 8601 format
   */
  private convertDate(value: any): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === "string") {
      // Try to parse and convert
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      return value; // Return as-is if parsing fails
    }
    if (typeof value === "number") {
      // Assume timestamp
      return new Date(value).toISOString();
    }
    return String(value || new Date().toISOString());
  }
}

export const fieldMappingEngine = new FieldMappingEngine();

