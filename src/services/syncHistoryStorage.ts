import { supabase } from "../db/supabase";

/**
 * Sync status enum
 */
export type SyncStatus = "pending" | "in_progress" | "completed" | "failed" | "cancelled";

/**
 * Item type enum
 */
export type ItemType = "epic" | "feature" | "user_story";

/**
 * Item status enum
 */
export type ItemStatus = "created" | "failed" | "skipped";

/**
 * Sync History interface
 */
export interface SyncHistory {
  id: string;
  source_type: string;
  source_config_id?: string;
  target_type: string;
  target_config_id?: string;
  project_name: string;
  status: SyncStatus;
  overwrite_mode: boolean;
  total_items: number;
  items_created: number;
  items_failed: number;
  epics_created: number;
  epics_failed: number;
  features_created: number;
  features_failed: number;
  user_stories_created: number;
  user_stories_failed: number;
  deletion_count: number;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  error_message?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Azure DevOps IdentityRef interface (for System.ChangedBy)
 */
export interface AzureDevOpsIdentityRef {
  displayName?: string;
  uniqueName?: string;
  id?: string;
  url?: string;
  imageUrl?: string;
  descriptor?: string;
  _links?: {
    avatar?: {
      href?: string;
    };
  };
}

/**
 * Sync History Item interface
 */
export interface SyncHistoryItem {
  id: string;
  sync_history_id: string;
  ardoq_id: string;
  item_name: string;
  item_type: ItemType;
  status: ItemStatus;
  azure_devops_id?: number;
  azure_devops_url?: string;
  error_message?: string;
  changed_by_user?: AzureDevOpsIdentityRef;
  created_at: string;
}

/**
 * Database row interfaces
 */
interface SyncHistoryRow {
  id: string;
  source_type: string;
  source_config_id: string | null;
  target_type: string;
  target_config_id: string | null;
  project_name: string;
  status: string;
  overwrite_mode: boolean;
  total_items: number;
  items_created: number;
  items_failed: number;
  epics_created: number;
  epics_failed: number;
  features_created: number;
  features_failed: number;
  user_stories_created: number;
  user_stories_failed: number;
  deletion_count: number;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface SyncHistoryItemRow {
  id: string;
  sync_history_id: string;
  ardoq_id: string;
  item_name: string;
  item_type: string;
  status: string;
  azure_devops_id: number | null;
  azure_devops_url: string | null;
  error_message: string | null;
  changed_by_user: AzureDevOpsIdentityRef | null;
  created_at: string;
}

/**
 * Sync History Storage Service
 */
class SyncHistoryStorage {
  private rowToSyncHistory(row: SyncHistoryRow): SyncHistory {
    return {
      id: row.id,
      source_type: row.source_type,
      source_config_id: row.source_config_id || undefined,
      target_type: row.target_type,
      target_config_id: row.target_config_id || undefined,
      project_name: row.project_name,
      status: row.status as SyncStatus,
      overwrite_mode: row.overwrite_mode,
      total_items: row.total_items,
      items_created: row.items_created,
      items_failed: row.items_failed,
      epics_created: row.epics_created,
      epics_failed: row.epics_failed,
      features_created: row.features_created,
      features_failed: row.features_failed,
      user_stories_created: row.user_stories_created,
      user_stories_failed: row.user_stories_failed,
      deletion_count: row.deletion_count,
      started_at: row.started_at || undefined,
      completed_at: row.completed_at || undefined,
      duration_ms: row.duration_ms || undefined,
      error_message: row.error_message || undefined,
      user_id: row.user_id || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private rowToSyncHistoryItem(row: SyncHistoryItemRow): SyncHistoryItem {
    return {
      id: row.id,
      sync_history_id: row.sync_history_id,
      ardoq_id: row.ardoq_id,
      item_name: row.item_name,
      item_type: row.item_type as ItemType,
      status: row.status as ItemStatus,
      azure_devops_id: row.azure_devops_id || undefined,
      azure_devops_url: row.azure_devops_url || undefined,
      error_message: row.error_message || undefined,
      changed_by_user: row.changed_by_user || undefined,
      created_at: row.created_at,
    };
  }

  /**
   * Create a new sync history record
   */
  async createSyncHistory(
    data: Omit<SyncHistory, "id" | "created_at" | "updated_at">
  ): Promise<SyncHistory> {
    const { data: row, error } = await supabase
      .from("sync_history")
      .insert({
        source_type: data.source_type,
        source_config_id: data.source_config_id || null,
        target_type: data.target_type,
        target_config_id: data.target_config_id || null,
        project_name: data.project_name,
        status: data.status,
        overwrite_mode: data.overwrite_mode,
        total_items: data.total_items,
        items_created: data.items_created,
        items_failed: data.items_failed,
        epics_created: data.epics_created,
        epics_failed: data.epics_failed,
        features_created: data.features_created,
        features_failed: data.features_failed,
        user_stories_created: data.user_stories_created,
        user_stories_failed: data.user_stories_failed,
        deletion_count: data.deletion_count,
        started_at: data.started_at || null,
        completed_at: data.completed_at || null,
        duration_ms: data.duration_ms || null,
        error_message: data.error_message || null,
        user_id: data.user_id || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create sync history: ${error.message}`);
    }

    return this.rowToSyncHistory(row as SyncHistoryRow);
  }

  /**
   * Update sync history record
   */
  async updateSyncHistory(
    id: string,
    data: Partial<Omit<SyncHistory, "id" | "created_at" | "updated_at">>
  ): Promise<SyncHistory> {
    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.total_items !== undefined) updateData.total_items = data.total_items;
    if (data.items_created !== undefined) updateData.items_created = data.items_created;
    if (data.items_failed !== undefined) updateData.items_failed = data.items_failed;
    if (data.epics_created !== undefined) updateData.epics_created = data.epics_created;
    if (data.epics_failed !== undefined) updateData.epics_failed = data.epics_failed;
    if (data.features_created !== undefined) updateData.features_created = data.features_created;
    if (data.features_failed !== undefined) updateData.features_failed = data.features_failed;
    if (data.user_stories_created !== undefined)
      updateData.user_stories_created = data.user_stories_created;
    if (data.user_stories_failed !== undefined)
      updateData.user_stories_failed = data.user_stories_failed;
    if (data.deletion_count !== undefined) updateData.deletion_count = data.deletion_count;
    if (data.started_at !== undefined) updateData.started_at = data.started_at || null;
    if (data.completed_at !== undefined) updateData.completed_at = data.completed_at || null;
    if (data.duration_ms !== undefined) updateData.duration_ms = data.duration_ms || null;
    if (data.error_message !== undefined) updateData.error_message = data.error_message || null;

    const { data: row, error } = await supabase
      .from("sync_history")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update sync history: ${error.message}`);
    }

    return this.rowToSyncHistory(row as SyncHistoryRow);
  }

  /**
   * Increment counter fields atomically
   * Fetches current values, adds increments, and updates
   */
  async incrementSyncHistoryCounters(
    id: string,
    counters: {
      items_created?: number;
      items_failed?: number;
      epics_created?: number;
      epics_failed?: number;
      features_created?: number;
      features_failed?: number;
      user_stories_created?: number;
      user_stories_failed?: number;
      deletion_count?: number;
    }
  ): Promise<SyncHistory> {
    // Fetch current values
    const { data: current, error: fetchError } = await supabase
      .from("sync_history")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      throw new Error(`Sync history with id ${id} not found`);
    }

    const currentRow = current as SyncHistoryRow;
    const update: any = {};

    // Calculate new values by adding increments
    if (counters.items_created !== undefined)
      update.items_created = currentRow.items_created + counters.items_created;
    if (counters.items_failed !== undefined)
      update.items_failed = currentRow.items_failed + counters.items_failed;
    if (counters.epics_created !== undefined)
      update.epics_created = currentRow.epics_created + counters.epics_created;
    if (counters.epics_failed !== undefined)
      update.epics_failed = currentRow.epics_failed + counters.epics_failed;
    if (counters.features_created !== undefined)
      update.features_created = currentRow.features_created + counters.features_created;
    if (counters.features_failed !== undefined)
      update.features_failed = currentRow.features_failed + counters.features_failed;
    if (counters.user_stories_created !== undefined)
      update.user_stories_created = currentRow.user_stories_created + counters.user_stories_created;
    if (counters.user_stories_failed !== undefined)
      update.user_stories_failed = currentRow.user_stories_failed + counters.user_stories_failed;
    if (counters.deletion_count !== undefined)
      update.deletion_count = currentRow.deletion_count + counters.deletion_count;

    return this.updateSyncHistory(id, update);
  }

  /**
   * Get sync history by ID
   */
  async getSyncHistoryById(id: string): Promise<SyncHistory | null> {
    const { data, error } = await supabase
      .from("sync_history")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get sync history: ${error.message}`);
    }

    return data ? this.rowToSyncHistory(data as SyncHistoryRow) : null;
  }

  /**
   * List sync history with filters and pagination
   */
  async listSyncHistory(options: {
    limit?: number;
    offset?: number;
    status?: SyncStatus;
    source_type?: string;
    target_type?: string;
    start_date?: string;
    end_date?: string;
    project_name?: string;
  }): Promise<{ data: SyncHistory[]; total: number }> {
    const limit = Math.min(options.limit || 50, 100);
    const offset = options.offset || 0;

    let query = supabase.from("sync_history").select("*", { count: "exact" });

    if (options.status) {
      query = query.eq("status", options.status);
    }
    if (options.source_type) {
      query = query.eq("source_type", options.source_type);
    }
    if (options.target_type) {
      query = query.eq("target_type", options.target_type);
    }
    if (options.start_date) {
      query = query.gte("created_at", options.start_date);
    }
    if (options.end_date) {
      query = query.lte("created_at", options.end_date);
    }
    if (options.project_name) {
      query = query.ilike("project_name", `%${options.project_name}%`);
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list sync history: ${error.message}`);
    }

    return {
      data: (data || []).map((row) => this.rowToSyncHistory(row as SyncHistoryRow)),
      total: count || 0,
    };
  }

  /**
   * Get sync statistics
   */
  async getSyncStatistics(options: {
    start_date?: string;
    end_date?: string;
  }): Promise<{
    total_syncs: number;
    completed_syncs: number;
    failed_syncs: number;
    cancelled_syncs: number;
    success_rate: number;
    average_duration_ms: number;
    total_items_created: number;
    total_items_failed: number;
  }> {
    let query = supabase.from("sync_history").select("*");

    if (options.start_date) {
      query = query.gte("created_at", options.start_date);
    }
    if (options.end_date) {
      query = query.lte("created_at", options.end_date);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get sync statistics: ${error.message}`);
    }

    const syncs = (data || []) as SyncHistoryRow[];
    const total_syncs = syncs.length;
    const completed_syncs = syncs.filter((s) => s.status === "completed").length;
    const failed_syncs = syncs.filter((s) => s.status === "failed").length;
    const cancelled_syncs = syncs.filter((s) => s.status === "cancelled").length;
    const success_rate =
      total_syncs > 0 ? (completed_syncs / total_syncs) * 100 : 0;

    const completedSyncs = syncs.filter((s) => s.status === "completed");
    const average_duration_ms =
      completedSyncs.length > 0
        ? completedSyncs.reduce((sum, s) => sum + (s.duration_ms || 0), 0) /
          completedSyncs.length
        : 0;

    const total_items_created = syncs.reduce((sum, s) => sum + s.items_created, 0);
    const total_items_failed = syncs.reduce((sum, s) => sum + s.items_failed, 0);

    return {
      total_syncs,
      completed_syncs,
      failed_syncs,
      cancelled_syncs,
      success_rate: Math.round(success_rate * 100) / 100,
      average_duration_ms: Math.round(average_duration_ms),
      total_items_created,
      total_items_failed,
    };
  }

  /**
   * Create sync history item
   */
  async createSyncHistoryItem(
    data: Omit<SyncHistoryItem, "id" | "created_at">
  ): Promise<SyncHistoryItem> {
    const { data: row, error } = await supabase
      .from("sync_history_items")
      .insert({
        sync_history_id: data.sync_history_id,
        ardoq_id: data.ardoq_id,
        item_name: data.item_name,
        item_type: data.item_type,
        status: data.status,
        azure_devops_id: data.azure_devops_id || null,
        azure_devops_url: data.azure_devops_url || null,
        error_message: data.error_message || null,
        changed_by_user: data.changed_by_user || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create sync history item: ${error.message}`);
    }

    return this.rowToSyncHistoryItem(row as SyncHistoryItemRow);
  }

  /**
   * Batch create sync history items
   */
  async batchCreateSyncHistoryItems(
    items: Omit<SyncHistoryItem, "id" | "created_at">[]
  ): Promise<SyncHistoryItem[]> {
    if (items.length === 0) return [];

    const { data, error } = await supabase
      .from("sync_history_items")
      .insert(
        items.map((item) => ({
          sync_history_id: item.sync_history_id,
          ardoq_id: item.ardoq_id,
          item_name: item.item_name,
          item_type: item.item_type,
          status: item.status,
          azure_devops_id: item.azure_devops_id || null,
          azure_devops_url: item.azure_devops_url || null,
          error_message: item.error_message || null,
          changed_by_user: item.changed_by_user || null,
        }))
      )
      .select();

    if (error) {
      throw new Error(`Failed to batch create sync history items: ${error.message}`);
    }

    return (data || []).map((row) => this.rowToSyncHistoryItem(row as SyncHistoryItemRow));
  }

  /**
   * List sync history items
   */
  async listSyncHistoryItems(options: {
    sync_history_id: string;
    limit?: number;
    offset?: number;
    status?: ItemStatus;
    item_type?: ItemType;
  }): Promise<{ data: SyncHistoryItem[]; total: number }> {
    const limit = Math.min(options.limit || 100, 500);
    const offset = options.offset || 0;

    let query = supabase
      .from("sync_history_items")
      .select("*", { count: "exact" })
      .eq("sync_history_id", options.sync_history_id);

    if (options.status) {
      query = query.eq("status", options.status);
    }
    if (options.item_type) {
      query = query.eq("item_type", options.item_type);
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list sync history items: ${error.message}`);
    }

    return {
      data: (data || []).map((row) => this.rowToSyncHistoryItem(row as SyncHistoryItemRow)),
      total: count || 0,
    };
  }
}

export const syncHistoryStorage = new SyncHistoryStorage();

