import { supabase } from "../db/supabase";

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
 * Database row interface (matches Supabase table structure)
 */
interface ArdoqConfigurationRow {
  id: string;
  name: string;
  api_token: string;
  api_host: string;
  org_label: string | null;
  is_active: boolean;
  is_tested: boolean;
  test_passed: boolean;
  test_error: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Configuration Storage Service
 * Manages Ardoq API configurations stored in Supabase
 */
class ConfigStorage {
  /**
   * Convert database row to ArdoqConfiguration interface
   */
  private rowToConfig(row: ArdoqConfigurationRow): ArdoqConfiguration {
    return {
      id: row.id,
      name: row.name,
      apiToken: row.api_token,
      apiHost: row.api_host,
      orgLabel: row.org_label || undefined,
      isActive: row.is_active,
      isTested: row.is_tested,
      testPassed: row.test_passed,
      testError: row.test_error || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Convert ArdoqConfiguration to database row format
   */
  private configToRow(
    config: Partial<ArdoqConfiguration>
  ): Partial<ArdoqConfigurationRow> {
    const row: Partial<ArdoqConfigurationRow> = {};
    if (config.name !== undefined) row.name = config.name;
    if (config.apiToken !== undefined) row.api_token = config.apiToken;
    if (config.apiHost !== undefined) row.api_host = config.apiHost;
    if (config.orgLabel !== undefined) row.org_label = config.orgLabel || null;
    if (config.isActive !== undefined) row.is_active = config.isActive;
    if (config.isTested !== undefined) row.is_tested = config.isTested;
    if (config.testPassed !== undefined) row.test_passed = config.testPassed;
    if (config.testError !== undefined)
      row.test_error = config.testError || null;
    return row;
  }

  /**
   * Check if a configuration with the same api_token and name already exists
   */
  async findDuplicateConfiguration(
    apiToken: string,
    name: string
  ): Promise<ArdoqConfiguration | null> {
    const { data, error } = await supabase
      .from("ardoq_configurations")
      .select("*")
      .eq("api_token", apiToken)
      .eq("name", name)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows returned" which is fine
      console.error("Error checking for duplicate configuration:", error);
      throw new Error(
        `Failed to check for duplicate configuration: ${error.message}`
      );
    }

    return data ? this.rowToConfig(data) : null;
  }

  /**
   * Save a new configuration
   */
  async saveConfiguration(
    config: Omit<ArdoqConfiguration, "id" | "createdAt" | "updatedAt">
  ): Promise<ArdoqConfiguration> {
    // Check for duplicate configuration
    const duplicate = await this.findDuplicateConfiguration(
      config.apiToken,
      config.name
    );

    if (duplicate) {
      throw new Error(
        `A configuration with the same credentials already exists (ID: ${duplicate.id}, Name: ${duplicate.name})`
      );
    }

    const id = `config-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;
    const isActive = config.isActive ?? false;

    // If this is set as active, deactivate all others
    if (isActive) {
      await supabase
        .from("ardoq_configurations")
        .update({ is_active: false })
        .neq("id", id); // Update all except the new one (which doesn't exist yet)
    }

    const row: Omit<ArdoqConfigurationRow, "created_at" | "updated_at"> = {
      id,
      name: config.name,
      api_token: config.apiToken,
      api_host: config.apiHost,
      org_label: config.orgLabel || null,
      is_active: isActive,
      is_tested: config.isTested ?? false,
      test_passed: config.testPassed ?? false,
      test_error: config.testError || null,
    };

    const { data, error } = await supabase
      .from("ardoq_configurations")
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error("Error saving configuration:", error);

      // Check if it's a unique constraint violation
      if (
        error.code === "23505" ||
        error.message?.includes("duplicate") ||
        error.message?.includes("unique")
      ) {
        throw new Error(
          `A configuration with the same apiToken and name already exists`
        );
      }

      throw new Error(`Failed to save configuration: ${error.message}`);
    }

    return this.rowToConfig(data);
  }

  /**
   * Get all configurations
   */
  async getAllConfigurations(): Promise<ArdoqConfiguration[]> {
    const { data, error } = await supabase
      .from("ardoq_configurations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching configurations:", error);
      throw new Error(`Failed to fetch configurations: ${error.message}`);
    }

    return (data || []).map((row) => this.rowToConfig(row));
  }

  /**
   * Get a configuration by ID
   */
  async getConfigurationById(
    id: string
  ): Promise<ArdoqConfiguration | undefined> {
    const { data, error } = await supabase
      .from("ardoq_configurations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return undefined;
      }
      console.error("Error fetching configuration:", error);
      throw new Error(`Failed to fetch configuration: ${error.message}`);
    }

    return data ? this.rowToConfig(data) : undefined;
  }

  /**
   * Get the active configuration
   */
  async getActiveConfiguration(): Promise<ArdoqConfiguration | undefined> {
    const { data, error } = await supabase
      .from("ardoq_configurations")
      .select("*")
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return undefined;
      }
      console.error("Error fetching active configuration:", error);
      throw new Error(`Failed to fetch active configuration: ${error.message}`);
    }

    return data ? this.rowToConfig(data) : undefined;
  }

  /**
   * Update a configuration
   */
  async updateConfiguration(
    id: string,
    updates: Partial<Omit<ArdoqConfiguration, "id" | "createdAt">>
  ): Promise<ArdoqConfiguration | null> {
    // If setting as active, deactivate all others first
    if (updates.isActive === true) {
      await supabase
        .from("ardoq_configurations")
        .update({ is_active: false })
        .neq("id", id);
    }

    const updateRow = this.configToRow(updates);

    const { data, error } = await supabase
      .from("ardoq_configurations")
      .update(updateRow)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned - configuration not found
        return null;
      }
      console.error("Error updating configuration:", error);
      throw new Error(`Failed to update configuration: ${error.message}`);
    }

    return data ? this.rowToConfig(data) : null;
  }

  /**
   * Delete a configuration
   */
  async deleteConfiguration(id: string): Promise<boolean> {
    const { error, count } = await supabase
      .from("ardoq_configurations")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      console.error("Error deleting configuration:", error);
      throw new Error(`Failed to delete configuration: ${error.message}`);
    }

    return (count || 0) > 0;
  }

  /**
   * Set a configuration as active
   */
  async setActiveConfiguration(id: string): Promise<ArdoqConfiguration | null> {
    return this.updateConfiguration(id, { isActive: true });
  }
}

export const configStorage = new ConfigStorage();
