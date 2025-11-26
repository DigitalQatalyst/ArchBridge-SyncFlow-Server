import { Component } from "../lib/buildComponentHierarchy";
import {
  FieldMappingConfig,
  FieldMappingTemplate,
  FieldMapping,
  WorkItemType,
} from "../types/fieldMapping";
import { fieldMappingStorage } from "./fieldMappingStorage";
import { getAzureDevOpsClient } from "./azureDevOpsClientHelper";

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
   * Get project's process template name from Azure DevOps
   */
  private async getProjectProcessTemplateName(
    projectId: string,
    configId?: string
  ): Promise<string | null> {
    try {
      const client = await getAzureDevOpsClient(configId);
      const project = await client.getProject(projectId);
      
      if (project?.capabilities?.processTemplate?.templateTypeId) {
        // Get all process templates to find the name
        const processes = await client.getProcesses();
        const processTemplate = processes.find(
          (p: any) => p.typeId === project.capabilities.processTemplate.templateTypeId
        );
        
        if (processTemplate?.name) {
          return processTemplate.name;
        }
      }
    } catch (error) {
      console.warn(
        `Failed to get process template for project ${projectId}:`,
        error
      );
    }
    
    return null;
  }

  /**
   * Load field mapping configuration, template, or return defaults
   * Resolution priority: project-specific config → process template template → hardcoded defaults
   */
  async loadConfiguration(
    configId: string | undefined,
    processTemplateTemplateName: string | undefined,
    projectId: string,
    azureDevOpsConfigId?: string
  ): Promise<FieldMappingConfig | FieldMappingTemplate | null> {
    // Priority 1: If project-specific config ID provided, load it
    if (configId) {
      try {
        const config = await fieldMappingStorage.getConfigurationById(configId);
        if (config) {
          console.log(`Using project-specific field mapping configuration: ${config.name}`);
          return config;
        }
        console.warn(
          `Field mapping configuration ${configId} not found, trying template`
        );
      } catch (error) {
        console.error(
          `Error loading field mapping configuration ${configId}:`,
          error
        );
        console.warn("Falling back to template");
      }
    }

    // Priority 2: Try process template template
    let templateName = processTemplateTemplateName;
    
    // If no template name provided, try to determine from project
    if (!templateName) {
      try {
        const defaultConfig = await fieldMappingStorage.getDefaultConfiguration(
          projectId
        );
        if (defaultConfig) {
          console.log(`Using default project-specific configuration: ${defaultConfig.name}`);
          return defaultConfig;
        }
      } catch (error) {
        console.warn(
          `Error loading default field mapping configuration for project ${projectId}:`,
          error
        );
      }

      // Try to get process template from Azure DevOps project
      templateName = await this.getProjectProcessTemplateName(projectId, azureDevOpsConfigId);
    }

    if (templateName) {
      try {
        const template = await fieldMappingStorage.getTemplateByProcessTemplateName(
          templateName
        );
        if (template) {
          console.log(`Using process template template: ${template.name} (${template.processTemplateName})`);
          return template;
        }
        console.warn(
          `Process template template for "${templateName}" not found, using hardcoded defaults`
        );
      } catch (error) {
        console.error(
          `Error loading process template template "${templateName}":`,
          error
        );
        console.warn("Falling back to hardcoded defaults");
      }
    }

    // Priority 3: Return null to indicate using hardcoded default mappings
    console.log("Using hardcoded default field mappings");
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
          ardoqField: "componentKey",
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
          ardoqField: "componentKey",
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
        {
          ardoqField: "componentKey",
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
    config: FieldMappingConfig | FieldMappingTemplate | null,
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
    // Both FieldMappingConfig and FieldMappingTemplate have a mappings array
    const mappings = config
      ? config.mappings.filter((m) => m.workItemType === workItemType)
      : this.getDefaultMappings()[workItemType];

    // Collect System.Tags values to combine them
    const tagsValues: string[] = [];
    const processedFields = new Set<string>();

    // Apply each mapping
    for (const mapping of mappings) {
      try {
        // Skip if we've already processed this field (for System.Tags combination)
        if (processedFields.has(mapping.azureDevOpsField) && mapping.azureDevOpsField === "System.Tags") {
          continue;
        }

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
          // Special handling for System.Tags - collect values to combine
          if (mapping.azureDevOpsField === "System.Tags") {
            const tagValue = typeof transformedValue === "string" ? transformedValue : String(transformedValue);
            if (tagValue.trim()) {
              tagsValues.push(tagValue.trim());
            }
            processedFields.add(mapping.azureDevOpsField);
          } else {
            patchDocument.push({
              op: "add",
              path: `/fields/${mapping.azureDevOpsField}`,
              value: transformedValue,
            });
            processedFields.add(mapping.azureDevOpsField);
          }
        }
      } catch (error) {
        console.warn(
          `Failed to map field ${mapping.ardoqField} to ${mapping.azureDevOpsField}:`,
          error
        );
        // Continue with other fields
      }
    }

    // Combine all System.Tags values if any were collected
    if (tagsValues.length > 0) {
      const combinedTags = tagsValues.join(", ");
      patchDocument.push({
        op: "add",
        path: "/fields/System.Tags",
        value: combinedTags,
      });
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
   * Tries multiple strategies: exact match, case-insensitive, common variations, customFields
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

    // Strategy 1: Try exact match with dot notation (supports nested paths)
    const parts = ardoqField.split(".");
    let value: any = component;
    let found = true;
    
    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        found = false;
        break;
      }
    }

    if (found && value !== undefined && value !== null) {
      return value;
    }

    // Strategy 2: For Features, try customFields first
    if (workItemType === "feature" && (component as any).customFields) {
      const customFields = (component as any).customFields;
      
      // Map common field names to customFields keys
      const customFieldMappings: Record<string, string[]> = {
        description: ["context_description", "description", "Description"],
        purpose: ["purpose", "Purpose"],
        input: ["input", "Input"],
        output: ["output_definition_of_done", "output", "Output", "definitionOfDone"],
        approach: ["approach", "Approach"],
        priority: ["priority", "Priority"],
      };

      if (customFieldMappings[ardoqField]) {
        for (const fieldName of customFieldMappings[ardoqField]) {
          if (fieldName in customFields) {
            const foundValue = customFields[fieldName];
            if (foundValue !== undefined && foundValue !== null && foundValue !== "") {
              return foundValue;
            }
          }
        }
      }
    }

    // Strategy 3: Check customFields for priority (works for Epic too)
    if (ardoqField === "priority" && (component as any).customFields) {
      const customFields = (component as any).customFields;
      if ("priority" in customFields) {
        const priorityValue = customFields.priority;
        if (priorityValue !== undefined && priorityValue !== null && priorityValue !== "") {
          return priorityValue;
        }
      }
    }

    // Strategy 4: Check _meta for lastUpdatedBy and lastUpdatedDate
    if (ardoqField === "lastUpdatedBy" && (component as any)._meta) {
      const meta = (component as any)._meta;
      // Try lastModifiedBy, lastModifiedByName, or lastModifiedByEmail
      if (meta.lastModifiedBy) return meta.lastModifiedBy;
      if (meta.lastModifiedByName) return meta.lastModifiedByName;
      if (meta.lastModifiedByEmail) return meta.lastModifiedByEmail;
    }

    if (ardoqField === "lastUpdatedDate" && (component as any)._meta) {
      const meta = (component as any)._meta;
      if (meta.lastUpdated) return meta.lastUpdated;
    }

    // Strategy 5: Try case-insensitive match on top level
    const componentKeys = Object.keys(component);
    const lowerField = ardoqField.toLowerCase();
    
    for (const key of componentKeys) {
      if (key.toLowerCase() === lowerField) {
        const foundValue = (component as any)[key];
        if (foundValue !== undefined && foundValue !== null) {
          return foundValue;
        }
      }
    }

    // Strategy 6: Try common field name variations
    const variations = this.getFieldNameVariations(ardoqField);
    for (const variation of variations) {
      if (variation in component) {
        const foundValue = (component as any)[variation];
        if (foundValue !== undefined && foundValue !== null) {
          return foundValue;
        }
      }
    }

    // Strategy 7: Try case-insensitive match for variations
    for (const variation of variations) {
      const lowerVariation = variation.toLowerCase();
      for (const key of componentKeys) {
        if (key.toLowerCase() === lowerVariation) {
          const foundValue = (component as any)[key];
          if (foundValue !== undefined && foundValue !== null) {
            return foundValue;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Get common variations of a field name
   * e.g., "description" -> ["Description", "description", "desc", "Description"]
   */
  private getFieldNameVariations(fieldName: string): string[] {
    const variations: string[] = [];
    
    // Original
    variations.push(fieldName);
    
    // Capitalized first letter
    if (fieldName.length > 0) {
      variations.push(fieldName.charAt(0).toUpperCase() + fieldName.slice(1));
    }
    
    // All lowercase
    variations.push(fieldName.toLowerCase());
    
    // All uppercase
    variations.push(fieldName.toUpperCase());
    
    // Common abbreviations
    const abbreviations: Record<string, string[]> = {
      description: ["desc", "Description", "DESCRIPTION"],
      acceptanceCriteria: ["acceptance", "criteria", "AcceptanceCriteria"],
      lastUpdatedBy: ["updatedBy", "lastUpdatedBy", "changedBy"],
      lastUpdatedDate: ["updatedDate", "lastUpdatedDate", "changedDate"],
    };
    
    if (abbreviations[fieldName]) {
      variations.push(...abbreviations[fieldName]);
    }
    
    // Remove duplicates
    return Array.from(new Set(variations));
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
   * Tries multiple field name variations to find values, including customFields
   */
  private buildFeatureDescription(feature: Component): string {
    const parts: string[] = [];

    // Try to find main description/context - check customFields first for Features
    let description = "";
    if ((feature as any).customFields) {
      const customFields = (feature as any).customFields;
      // Try context_description first (Ardoq standard), then description
      description = customFields.context_description || customFields.description || "";
    }
    
    // Fallback to root level fields
    if (!description) {
      description = this.findFieldValue(feature, ["description", "Description", "context", "Context", "desc", "Desc"]) || "";
    }

    if (description) {
      parts.push(description);
    }

    // Add purpose, input, output, approach sections
    // For Features, these are typically in customFields
    const sections: Array<{ label: string; fields: string[] }> = [
      { label: "Purpose", fields: ["purpose", "Purpose"] },
      { label: "Input", fields: ["input", "Input"] },
      { label: "Output (Definition of Done)", fields: ["output_definition_of_done", "output", "Output", "definitionOfDone", "DefinitionOfDone"] },
      { label: "Approach", fields: ["approach", "Approach"] },
    ];

    const sectionParts: string[] = [];
    for (const section of sections) {
      let value: any = undefined;
      
      // Check customFields first for Features
      if ((feature as any).customFields) {
        const customFields = (feature as any).customFields;
        for (const fieldName of section.fields) {
          if (fieldName in customFields) {
            const foundValue = customFields[fieldName];
            if (foundValue !== undefined && foundValue !== null && foundValue !== "") {
              value = foundValue;
              break;
            }
          }
        }
      }
      
      // Fallback to root level
      if (value === undefined) {
        value = this.findFieldValue(feature, section.fields);
      }
      
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
   * Find field value by trying multiple field name variations
   */
  private findFieldValue(component: Component, fieldNames: string[]): any {
    for (const fieldName of fieldNames) {
      // Try exact match
      if (fieldName in component) {
        const value = (component as any)[fieldName];
        if (value !== undefined && value !== null) {
          return value;
        }
      }
      
      // Try case-insensitive match
      const componentKeys = Object.keys(component);
      const lowerField = fieldName.toLowerCase();
      for (const key of componentKeys) {
        if (key.toLowerCase() === lowerField) {
          const value = (component as any)[key];
          if (value !== undefined && value !== null) {
            return value;
          }
        }
      }
    }
    
    return undefined;
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

