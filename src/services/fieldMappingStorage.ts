import { supabase } from "../db/supabase";
import {
  FieldMappingConfig,
  FieldMapping,
  FieldMappingConfigRow,
  FieldMappingRow,
  FieldMappingTemplate,
  FieldMappingTemplateRow,
  WorkItemType,
} from "../types/fieldMapping";

/**
 * Field Mapping Storage Service
 * Manages field mapping configurations and mappings stored in Supabase
 */
class FieldMappingStorage {
  /**
   * Convert database row to FieldMappingConfig interface
   */
  private rowToConfig(row: FieldMappingConfigRow): FieldMappingConfig {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      projectId: row.project_id,
      projectName: row.project_name || undefined,
      isDefault: row.is_default,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      mappings: [], // Will be loaded separately
    };
  }

  /**
   * Convert database row to FieldMapping interface
   */
  private rowToMapping(row: FieldMappingRow): FieldMapping {
    return {
      id: row.id,
      ardoqField: row.ardoq_field,
      azureDevOpsField: row.azure_devops_field,
      workItemType: row.work_item_type,
      transformFunction: row.transform_function || undefined,
    };
  }

  /**
   * Convert database row to FieldMappingTemplate interface
   */
  private rowToTemplate(row: FieldMappingTemplateRow): FieldMappingTemplate {
    return {
      id: row.id,
      processTemplateName: row.process_template_name,
      processTemplateTypeId: row.process_template_type_id || undefined,
      name: row.name,
      description: row.description || undefined,
      isSystemDefault: row.is_system_default,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      mappings: [], // Will be loaded separately
    };
  }

  /**
   * Convert FieldMappingConfig to database row format
   */
  private configToRow(
    config: Partial<FieldMappingConfig>
  ): Partial<FieldMappingConfigRow> {
    const row: Partial<FieldMappingConfigRow> = {};
    if (config.name !== undefined) row.name = config.name;
    if (config.description !== undefined)
      row.description = config.description || null;
    if (config.projectId !== undefined) row.project_id = config.projectId;
    if (config.projectName !== undefined)
      row.project_name = config.projectName || null;
    if (config.isDefault !== undefined) row.is_default = config.isDefault;
    return row;
  }

  /**
   * Save a new field mapping configuration
   */
  async saveConfiguration(
    config: Omit<FieldMappingConfig, "id" | "createdAt" | "updatedAt" | "mappings">,
    mappings: Omit<FieldMapping, "id">[]
  ): Promise<FieldMappingConfig> {
    // If this is set as default, unset other defaults for the same project
    if (config.isDefault) {
      await supabase
        .from("field_mapping_configs")
        .update({ is_default: false })
        .eq("project_id", config.projectId)
        .neq("id", "dummy"); // This will match all rows since dummy doesn't exist
    }

    const id = `fm-config-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    const row: Omit<FieldMappingConfigRow, "created_at" | "updated_at"> = {
      id,
      name: config.name,
      description: config.description || null,
      project_id: config.projectId,
      project_name: config.projectName || null,
      is_default: config.isDefault ?? false,
    };

    const { data: configData, error: configError } = await supabase
      .from("field_mapping_configs")
      .insert(row)
      .select()
      .single();

    if (configError) {
      console.error("Error saving field mapping configuration:", configError);
      throw new Error(
        `Failed to save field mapping configuration: ${configError.message}`
      );
    }

    // Save mappings
    if (mappings.length > 0) {
      const mappingRows: Omit<FieldMappingRow, "created_at">[] = mappings.map(
        (mapping) => ({
          id: `fm-mapping-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 11)}`,
          config_id: id,
          template_id: null,
          work_item_type: mapping.workItemType,
          ardoq_field: mapping.ardoqField,
          azure_devops_field: mapping.azureDevOpsField,
          transform_function: mapping.transformFunction || null,
        })
      );

      const { error: mappingsError } = await supabase
        .from("field_mappings")
        .insert(mappingRows);

      if (mappingsError) {
        // Rollback: delete the config if mappings fail
        await supabase.from("field_mapping_configs").delete().eq("id", id);
        console.error("Error saving field mappings:", mappingsError);
        throw new Error(
          `Failed to save field mappings: ${mappingsError.message}`
        );
      }
    }

    // Load the complete configuration with mappings
    return this.getConfigurationById(id)!;
  }

  /**
   * Get a configuration by ID
   */
  async getConfigurationById(
    id: string
  ): Promise<FieldMappingConfig | undefined> {
    const { data: configData, error: configError } = await supabase
      .from("field_mapping_configs")
      .select("*")
      .eq("id", id)
      .single();

    if (configError) {
      if (configError.code === "PGRST116") {
        return undefined;
      }
      console.error("Error fetching field mapping configuration:", configError);
      throw new Error(
        `Failed to fetch field mapping configuration: ${configError.message}`
      );
    }

    if (!configData) {
      return undefined;
    }

    // Load mappings
    const { data: mappingsData, error: mappingsError } = await supabase
      .from("field_mappings")
      .select("*")
      .eq("config_id", id)
      .order("work_item_type", { ascending: true })
      .order("ardoq_field", { ascending: true });

    if (mappingsError) {
      console.error("Error fetching field mappings:", mappingsError);
      throw new Error(
        `Failed to fetch field mappings: ${mappingsError.message}`
      );
    }

    const config = this.rowToConfig(configData);
    config.mappings = (mappingsData || []).map((row) => this.rowToMapping(row));
    return config;
  }

  /**
   * Get all configurations for a project
   */
  async getConfigurationsByProject(
    projectId: string
  ): Promise<FieldMappingConfig[]> {
    const { data: configsData, error: configsError } = await supabase
      .from("field_mapping_configs")
      .select("*")
      .eq("project_id", projectId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (configsError) {
      console.error("Error fetching field mapping configurations:", configsError);
      throw new Error(
        `Failed to fetch field mapping configurations: ${configsError.message}`
      );
    }

    if (!configsData || configsData.length === 0) {
      return [];
    }

    // Load mappings for all configs
    const configIds = configsData.map((c) => c.id);
    const { data: mappingsData, error: mappingsError } = await supabase
      .from("field_mappings")
      .select("*")
      .in("config_id", configIds)
      .order("config_id", { ascending: true })
      .order("work_item_type", { ascending: true });

    if (mappingsError) {
      console.error("Error fetching field mappings:", mappingsError);
      throw new Error(
        `Failed to fetch field mappings: ${mappingsError.message}`
      );
    }

    // Group mappings by config_id
    const mappingsByConfig = new Map<string, FieldMapping[]>();
    (mappingsData || []).forEach((row) => {
      const mapping = this.rowToMapping(row);
      if (!mappingsByConfig.has(row.config_id)) {
        mappingsByConfig.set(row.config_id, []);
      }
      mappingsByConfig.get(row.config_id)!.push(mapping);
    });

    // Combine configs with their mappings
    return configsData.map((configRow) => {
      const config = this.rowToConfig(configRow);
      config.mappings = mappingsByConfig.get(config.id) || [];
      return config;
    });
  }

  /**
   * Get the default configuration for a project
   */
  async getDefaultConfiguration(
    projectId: string
  ): Promise<FieldMappingConfig | undefined> {
    const { data: configData, error: configError } = await supabase
      .from("field_mapping_configs")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_default", true)
      .single();

    if (configError) {
      if (configError.code === "PGRST116") {
        return undefined;
      }
      console.error("Error fetching default field mapping configuration:", configError);
      throw new Error(
        `Failed to fetch default field mapping configuration: ${configError.message}`
      );
    }

    if (!configData) {
      return undefined;
    }

    return this.getConfigurationById(configData.id);
  }

  /**
   * Update a configuration
   */
  async updateConfiguration(
    id: string,
    updates: Partial<
      Omit<FieldMappingConfig, "id" | "createdAt" | "updatedAt" | "mappings">
    >,
    mappings?: Omit<FieldMapping, "id">[]
  ): Promise<FieldMappingConfig | null> {
    // If setting as default, unset other defaults for the same project
    if (updates.isDefault === true) {
      const { data: existingConfig } = await supabase
        .from("field_mapping_configs")
        .select("project_id")
        .eq("id", id)
        .single();

      if (existingConfig) {
        await supabase
          .from("field_mapping_configs")
          .update({ is_default: false })
          .eq("project_id", existingConfig.project_id)
          .neq("id", id);
      }
    }

    const updateRow = this.configToRow(updates);

    const { data: configData, error: configError } = await supabase
      .from("field_mapping_configs")
      .update(updateRow)
      .eq("id", id)
      .select()
      .single();

    if (configError) {
      if (configError.code === "PGRST116") {
        return null;
      }
      console.error("Error updating field mapping configuration:", configError);
      throw new Error(
        `Failed to update field mapping configuration: ${configError.message}`
      );
    }

    // Update mappings if provided
    if (mappings !== undefined) {
      // Delete existing mappings
      const { error: deleteError } = await supabase
        .from("field_mappings")
        .delete()
        .eq("config_id", id);

      if (deleteError) {
        console.error("Error deleting old field mappings:", deleteError);
        throw new Error(
          `Failed to delete old field mappings: ${deleteError.message}`
        );
      }

      // Insert new mappings
      if (mappings.length > 0) {
        const mappingRows: Omit<FieldMappingRow, "created_at">[] = mappings.map(
          (mapping) => ({
            id: `fm-mapping-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 11)}`,
            config_id: id,
            template_id: null,
            work_item_type: mapping.workItemType,
            ardoq_field: mapping.ardoqField,
            azure_devops_field: mapping.azureDevOpsField,
            transform_function: mapping.transformFunction || null,
          })
        );

        const { error: insertError } = await supabase
          .from("field_mappings")
          .insert(mappingRows);

        if (insertError) {
          console.error("Error inserting new field mappings:", insertError);
          throw new Error(
            `Failed to insert new field mappings: ${insertError.message}`
          );
        }
      }
    }

    return this.getConfigurationById(id)!;
  }

  /**
   * Delete a configuration (cascades to mappings)
   */
  async deleteConfiguration(id: string): Promise<boolean> {
    const { error, count } = await supabase
      .from("field_mapping_configs")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      console.error("Error deleting field mapping configuration:", error);
      throw new Error(
        `Failed to delete field mapping configuration: ${error.message}`
      );
    }

    return (count || 0) > 0;
  }

  /**
   * Get mappings for a configuration
   */
  async getMappingsByConfig(
    configId: string
  ): Promise<FieldMapping[]> {
    const { data, error } = await supabase
      .from("field_mappings")
      .select("*")
      .eq("config_id", configId)
      .order("work_item_type", { ascending: true })
      .order("ardoq_field", { ascending: true });

    if (error) {
      console.error("Error fetching field mappings:", error);
      throw new Error(`Failed to fetch field mappings: ${error.message}`);
    }

    return (data || []).map((row) => this.rowToMapping(row));
  }

  /**
   * Get mappings for a configuration filtered by work item type
   */
  async getMappingsByConfigAndType(
    configId: string,
    workItemType: WorkItemType
  ): Promise<FieldMapping[]> {
    const { data, error } = await supabase
      .from("field_mappings")
      .select("*")
      .eq("config_id", configId)
      .eq("work_item_type", workItemType)
      .order("ardoq_field", { ascending: true });

    if (error) {
      console.error("Error fetching field mappings:", error);
      throw new Error(`Failed to fetch field mappings: ${error.message}`);
    }

    return (data || []).map((row) => this.rowToMapping(row));
  }

  // ==================== Template Methods ====================

  /**
   * Get all templates, optionally filtered by process template name
   */
  async getTemplates(
    processTemplateName?: string
  ): Promise<FieldMappingTemplate[]> {
    let query = supabase
      .from("field_mapping_templates")
      .select("*")
      .order("process_template_name", { ascending: true });

    if (processTemplateName) {
      query = query.eq("process_template_name", processTemplateName);
    }

    const { data: templatesData, error: templatesError } = await query;

    if (templatesError) {
      console.error("Error fetching field mapping templates:", templatesError);
      throw new Error(
        `Failed to fetch field mapping templates: ${templatesError.message}`
      );
    }

    if (!templatesData || templatesData.length === 0) {
      return [];
    }

    // Load mappings for all templates
    const templateIds = templatesData.map((t) => t.id);
    const { data: mappingsData, error: mappingsError } = await supabase
      .from("field_mappings")
      .select("*")
      .in("template_id", templateIds)
      .order("template_id", { ascending: true })
      .order("work_item_type", { ascending: true });

    if (mappingsError) {
      console.error("Error fetching template mappings:", mappingsError);
      throw new Error(
        `Failed to fetch template mappings: ${mappingsError.message}`
      );
    }

    // Group mappings by template_id
    const mappingsByTemplate = new Map<string, FieldMapping[]>();
    (mappingsData || []).forEach((row) => {
      if (row.template_id) {
        const mapping = this.rowToMapping(row);
        if (!mappingsByTemplate.has(row.template_id)) {
          mappingsByTemplate.set(row.template_id, []);
        }
        mappingsByTemplate.get(row.template_id)!.push(mapping);
      }
    });

    // Combine templates with their mappings
    return templatesData.map((templateRow) => {
      const template = this.rowToTemplate(templateRow);
      template.mappings = mappingsByTemplate.get(template.id) || [];
      return template;
    });
  }

  /**
   * Get a template by ID
   */
  async getTemplateById(
    id: string
  ): Promise<FieldMappingTemplate | undefined> {
    const { data: templateData, error: templateError } = await supabase
      .from("field_mapping_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (templateError) {
      if (templateError.code === "PGRST116") {
        return undefined;
      }
      console.error("Error fetching field mapping template:", templateError);
      throw new Error(
        `Failed to fetch field mapping template: ${templateError.message}`
      );
    }

    if (!templateData) {
      return undefined;
    }

    // Load mappings
    const { data: mappingsData, error: mappingsError } = await supabase
      .from("field_mappings")
      .select("*")
      .eq("template_id", id)
      .order("work_item_type", { ascending: true })
      .order("ardoq_field", { ascending: true });

    if (mappingsError) {
      console.error("Error fetching template mappings:", mappingsError);
      throw new Error(
        `Failed to fetch template mappings: ${mappingsError.message}`
      );
    }

    const template = this.rowToTemplate(templateData);
    template.mappings = (mappingsData || []).map((row) => this.rowToMapping(row));
    return template;
  }

  /**
   * Get a template by process template name
   */
  async getTemplateByProcessTemplateName(
    processTemplateName: string
  ): Promise<FieldMappingTemplate | undefined> {
    const { data: templateData, error: templateError } = await supabase
      .from("field_mapping_templates")
      .select("*")
      .eq("process_template_name", processTemplateName)
      .single();

    if (templateError) {
      if (templateError.code === "PGRST116") {
        return undefined;
      }
      console.error("Error fetching field mapping template:", templateError);
      throw new Error(
        `Failed to fetch field mapping template: ${templateError.message}`
      );
    }

    if (!templateData) {
      return undefined;
    }

    return this.getTemplateById(templateData.id);
  }

  /**
   * Save a template (for system initialization only - templates are read-only)
   * This method should only be used during database initialization/migration
   */
  async saveTemplate(
    template: Omit<FieldMappingTemplate, "id" | "createdAt" | "updatedAt" | "mappings">,
    mappings: Omit<FieldMapping, "id">[]
  ): Promise<FieldMappingTemplate> {
    const id = `template-${template.processTemplateName.toLowerCase()}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    const row: Omit<FieldMappingTemplateRow, "created_at" | "updated_at"> = {
      id,
      process_template_name: template.processTemplateName,
      process_template_type_id: template.processTemplateTypeId || null,
      name: template.name,
      description: template.description || null,
      is_system_default: template.isSystemDefault ?? true,
    };

    const { data: templateData, error: templateError } = await supabase
      .from("field_mapping_templates")
      .insert(row)
      .select()
      .single();

    if (templateError) {
      console.error("Error saving field mapping template:", templateError);
      throw new Error(
        `Failed to save field mapping template: ${templateError.message}`
      );
    }

    // Save mappings
    if (mappings.length > 0) {
      const mappingRows: Omit<FieldMappingRow, "created_at">[] = mappings.map(
        (mapping) => ({
          id: `fm-mapping-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 11)}`,
          config_id: null,
          template_id: id,
          work_item_type: mapping.workItemType,
          ardoq_field: mapping.ardoqField,
          azure_devops_field: mapping.azureDevOpsField,
          transform_function: mapping.transformFunction || null,
        })
      );

      const { error: mappingsError } = await supabase
        .from("field_mappings")
        .insert(mappingRows);

      if (mappingsError) {
        // Rollback: delete the template if mappings fail
        await supabase.from("field_mapping_templates").delete().eq("id", id);
        console.error("Error saving template mappings:", mappingsError);
        throw new Error(
          `Failed to save template mappings: ${mappingsError.message}`
        );
      }
    }

    // Load the complete template with mappings
    return this.getTemplateById(id)!;
  }
}

export const fieldMappingStorage = new FieldMappingStorage();

