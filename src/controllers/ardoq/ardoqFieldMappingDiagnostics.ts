import { Request, Response } from "express";
import { getArdoqClient } from "../../services/ardoqClientHelper";
import { Component } from "../../lib/buildComponentHierarchy";
import { fieldMappingEngine } from "../../services/fieldMappingEngine";
import { fieldMappingStorage } from "../../services/fieldMappingStorage";

/**
 * Diagnostic endpoint to inspect Ardoq component structure and test field mapping
 * GET /api/ardoq/workspaces/:workspaceId/field-mapping-diagnostics?configId=xxx&componentType=Feature
 * 
 * Query params:
 * - configId (optional): Ardoq configuration ID
 * - componentType (optional): Filter by component type (Epic, Feature, User Story)
 * - limit (optional): Limit number of components to analyze (default: 5)
 */
export const diagnoseFieldMapping = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const configId = req.query.configId as string | undefined;
    const componentType = req.query.componentType as string | undefined;
    const limit = parseInt(req.query.limit as string || "5", 10);

    if (!workspaceId) {
      res.status(400).json({
        success: false,
        error: "workspaceId parameter is required",
      });
      return;
    }

    const client = await getArdoqClient(configId);

    // Fetch all components for the workspace
    let response: any;
    let components: Component[] = [];
    let rawResponseData: any = null;
    
    try {
      response = await client.get("/api/v2/components", {
        rootWorkspace: workspaceId,
      });

      // Try multiple possible response structures
      components = response.values || response.data?.values || response || [];
      
      // Store raw response for debugging
      rawResponseData = {
        hasValues: !!response.values,
        hasDataValues: !!response.data?.values,
        responseKeys: Object.keys(response || {}),
        responseType: Array.isArray(response) ? 'array' : typeof response,
        responseLength: Array.isArray(response) ? response.length : undefined,
      };
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: `Failed to fetch components from Ardoq: ${error.message || String(error)}`,
        details: {
          workspaceId,
          configId: configId || "using active config",
          errorDetails: error.response?.data || error.stack,
        },
      });
      return;
    }

    // Get component type distribution
    const componentTypeDistribution: Record<string, number> = {};
    components.forEach((c) => {
      const type = c.type || "unknown";
      componentTypeDistribution[type] = (componentTypeDistribution[type] || 0) + 1;
    });

    // Filter by component type if specified
    let filteredComponents = components;
    if (componentType) {
      filteredComponents = components.filter(
        (c) => c.type === componentType
      );
    }

    // Limit the number of components to analyze
    const componentsToAnalyze = filteredComponents.slice(0, limit);

    if (componentsToAnalyze.length === 0) {
      res.json({
        success: true,
        data: {
          message: `No components found${componentType ? ` of type ${componentType}` : ""}`,
          totalComponents: components.length,
          filteredComponents: filteredComponents.length,
          analyzedComponents: 0,
          diagnostics: [],
          // Debugging information
          debugging: {
            workspaceId,
            configId: configId || "using active config",
            rawResponseInfo: rawResponseData,
            componentTypeDistribution,
            availableComponentTypes: Object.keys(componentTypeDistribution),
            suggestion: components.length === 0 
              ? "Try calling GET /api/ardoq/workspaces/:workspaceId/components to verify components exist in this workspace"
              : `Try without componentType filter or use one of: ${Object.keys(componentTypeDistribution).join(", ")}`,
          },
        },
      });
      return;
    }

    // Analyze each component
    const diagnostics = componentsToAnalyze.map((component) => {
      // Determine work item type
      let workItemType: "epic" | "feature" | "user_story" | null = null;
      if (component.type === "Epic") workItemType = "epic";
      else if (component.type === "Feature") workItemType = "feature";
      else if (component.type === "User Story") workItemType = "user_story";

      // Get all field values that might be relevant
      const fieldValues: Record<string, any> = {};
      
      // Common fields to check
      const fieldsToCheck = [
        "description",
        "Description",
        "context",
        "Context",
        "purpose",
        "Purpose",
        "input",
        "Input",
        "output",
        "Output",
        "approach",
        "Approach",
        "priority",
        "Priority",
        "tags",
        "Tags",
        "acceptanceCriteria",
        "AcceptanceCriteria",
        "classification",
        "Classification",
        "risk",
        "Risk",
        "lastUpdatedBy",
        "lastUpdatedDate",
      ];

      // Extract all fields from component
      for (const field of fieldsToCheck) {
        const value = (component as any)[field];
        if (value !== undefined && value !== null) {
          fieldValues[field] = value;
        }
      }

      // Also get all top-level keys from component
      const allComponentKeys = Object.keys(component);
      const otherFields: Record<string, any> = {};
      for (const key of allComponentKeys) {
        if (
          !fieldsToCheck.includes(key) &&
          !["_id", "name", "type", "parent", "children"].includes(key)
        ) {
          const value = (component as any)[key];
          if (value !== undefined && value !== null) {
            otherFields[key] = value;
          }
        }
      }

      // Test field mapping extraction
      const mappingTests: Record<string, any> = {};
      if (workItemType) {
        // Get default mappings for this work item type
        const defaultMappings = fieldMappingEngine.getDefaultMappings()[workItemType];
        
        for (const mapping of defaultMappings) {
          try {
            // Use reflection to access private method for testing
            const value = (fieldMappingEngine as any).getFieldValue(
              component,
              mapping.ardoqField,
              workItemType
            );
            mappingTests[mapping.ardoqField] = {
              azureDevOpsField: mapping.azureDevOpsField,
              extractedValue: value,
              isNull: value === null,
              isUndefined: value === undefined,
              type: typeof value,
              stringValue: value !== null && value !== undefined ? String(value) : null,
            };
          } catch (error: any) {
            mappingTests[mapping.ardoqField] = {
              azureDevOpsField: mapping.azureDevOpsField,
              error: error.message || String(error),
            };
          }
        }
      }

      return {
        componentId: component._id,
        componentName: component.name,
        componentType: component.type,
        workItemType,
        // Full component structure (excluding children to avoid circular refs)
        componentStructure: {
          ...component,
          children: undefined, // Remove children to avoid circular references
        },
        // Field values found
        fieldValues,
        // Other fields not in the standard list
        otherFields,
        // Field mapping test results
        mappingTests,
        // Summary
        summary: {
          totalFields: allComponentKeys.length,
          mappedFieldsFound: Object.keys(fieldValues).length,
          otherFieldsFound: Object.keys(otherFields).length,
          mappingTestsPassed: Object.values(mappingTests).filter(
            (test: any) => !test.isNull && !test.isUndefined && !test.error
          ).length,
          mappingTestsFailed: Object.values(mappingTests).filter(
            (test: any) => test.isNull || test.isUndefined || test.error
          ).length,
        },
      };
    });

    res.json({
      success: true,
      data: {
        workspaceId,
        totalComponents: components.length,
        filteredComponents: filteredComponents.length,
        analyzedComponents: componentsToAnalyze.length,
        componentTypeFilter: componentType || "all",
        diagnostics,
        // Summary across all components
        summary: {
          componentsWithDescription: diagnostics.filter(
            (d) => d.fieldValues.description || d.fieldValues.Description || d.fieldValues.context || d.fieldValues.Context
          ).length,
          componentsWithoutDescription: diagnostics.filter(
            (d) => !d.fieldValues.description && !d.fieldValues.Description && !d.fieldValues.context && !d.fieldValues.Context
          ).length,
          averageFieldsPerComponent: diagnostics.reduce(
            (sum, d) => sum + d.summary.totalFields,
            0
          ) / diagnostics.length,
          commonOtherFields: findCommonFields(diagnostics.map((d) => Object.keys(d.otherFields))),
        },
      },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to diagnose field mapping",
      details: error.stack,
    });
  }
};

/**
 * Find common fields across multiple components
 */
function findCommonFields(fieldArrays: string[][]): string[] {
  if (fieldArrays.length === 0) return [];
  
  const fieldCounts = new Map<string, number>();
  
  for (const fields of fieldArrays) {
    const uniqueFields = new Set(fields);
    for (const field of uniqueFields) {
      fieldCounts.set(field, (fieldCounts.get(field) || 0) + 1);
    }
  }
  
  // Return fields that appear in at least 50% of components
  const threshold = Math.ceil(fieldArrays.length * 0.5);
  return Array.from(fieldCounts.entries())
    .filter(([_, count]) => count >= threshold)
    .map(([field, _]) => field)
    .sort();
}

