"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncHistoryStorage = void 0;
const supabase_1 = require("../db/supabase");
/**
 * Sync History Storage Service
 */
class SyncHistoryStorage {
    rowToSyncHistory(row) {
        return {
            id: row.id,
            source_type: row.source_type,
            source_config_id: row.source_config_id || undefined,
            target_type: row.target_type,
            target_config_id: row.target_config_id || undefined,
            project_name: row.project_name,
            status: row.status,
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
    rowToSyncHistoryItem(row) {
        return {
            id: row.id,
            sync_history_id: row.sync_history_id,
            ardoq_id: row.ardoq_id,
            item_name: row.item_name,
            item_type: row.item_type,
            status: row.status,
            azure_devops_id: row.azure_devops_id || undefined,
            azure_devops_url: row.azure_devops_url || undefined,
            error_message: row.error_message || undefined,
            created_at: row.created_at,
        };
    }
    /**
     * Create a new sync history record
     */
    async createSyncHistory(data) {
        const { data: row, error } = await supabase_1.supabase
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
        return this.rowToSyncHistory(row);
    }
    /**
     * Update sync history record
     */
    async updateSyncHistory(id, data) {
        const updateData = {};
        if (data.status !== undefined)
            updateData.status = data.status;
        if (data.total_items !== undefined)
            updateData.total_items = data.total_items;
        if (data.items_created !== undefined)
            updateData.items_created = data.items_created;
        if (data.items_failed !== undefined)
            updateData.items_failed = data.items_failed;
        if (data.epics_created !== undefined)
            updateData.epics_created = data.epics_created;
        if (data.epics_failed !== undefined)
            updateData.epics_failed = data.epics_failed;
        if (data.features_created !== undefined)
            updateData.features_created = data.features_created;
        if (data.features_failed !== undefined)
            updateData.features_failed = data.features_failed;
        if (data.user_stories_created !== undefined)
            updateData.user_stories_created = data.user_stories_created;
        if (data.user_stories_failed !== undefined)
            updateData.user_stories_failed = data.user_stories_failed;
        if (data.deletion_count !== undefined)
            updateData.deletion_count = data.deletion_count;
        if (data.started_at !== undefined)
            updateData.started_at = data.started_at || null;
        if (data.completed_at !== undefined)
            updateData.completed_at = data.completed_at || null;
        if (data.duration_ms !== undefined)
            updateData.duration_ms = data.duration_ms || null;
        if (data.error_message !== undefined)
            updateData.error_message = data.error_message || null;
        const { data: row, error } = await supabase_1.supabase
            .from("sync_history")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to update sync history: ${error.message}`);
        }
        return this.rowToSyncHistory(row);
    }
    /**
     * Increment counter fields atomically
     * Fetches current values, adds increments, and updates
     */
    async incrementSyncHistoryCounters(id, counters) {
        // Fetch current values
        const { data: current, error: fetchError } = await supabase_1.supabase
            .from("sync_history")
            .select("*")
            .eq("id", id)
            .single();
        if (fetchError || !current) {
            throw new Error(`Sync history with id ${id} not found`);
        }
        const currentRow = current;
        const update = {};
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
    async getSyncHistoryById(id) {
        const { data, error } = await supabase_1.supabase
            .from("sync_history")
            .select("*")
            .eq("id", id)
            .maybeSingle();
        if (error) {
            throw new Error(`Failed to get sync history: ${error.message}`);
        }
        return data ? this.rowToSyncHistory(data) : null;
    }
    /**
     * List sync history with filters and pagination
     */
    async listSyncHistory(options) {
        const limit = Math.min(options.limit || 50, 100);
        const offset = options.offset || 0;
        let query = supabase_1.supabase.from("sync_history").select("*", { count: "exact" });
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
            data: (data || []).map((row) => this.rowToSyncHistory(row)),
            total: count || 0,
        };
    }
    /**
     * Get sync statistics
     */
    async getSyncStatistics(options) {
        let query = supabase_1.supabase.from("sync_history").select("*");
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
        const syncs = (data || []);
        const total_syncs = syncs.length;
        const completed_syncs = syncs.filter((s) => s.status === "completed").length;
        const failed_syncs = syncs.filter((s) => s.status === "failed").length;
        const cancelled_syncs = syncs.filter((s) => s.status === "cancelled").length;
        const success_rate = total_syncs > 0 ? (completed_syncs / total_syncs) * 100 : 0;
        const completedSyncs = syncs.filter((s) => s.status === "completed");
        const average_duration_ms = completedSyncs.length > 0
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
    async createSyncHistoryItem(data) {
        const { data: row, error } = await supabase_1.supabase
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
        })
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create sync history item: ${error.message}`);
        }
        return this.rowToSyncHistoryItem(row);
    }
    /**
     * Batch create sync history items
     */
    async batchCreateSyncHistoryItems(items) {
        if (items.length === 0)
            return [];
        const { data, error } = await supabase_1.supabase
            .from("sync_history_items")
            .insert(items.map((item) => ({
            sync_history_id: item.sync_history_id,
            ardoq_id: item.ardoq_id,
            item_name: item.item_name,
            item_type: item.item_type,
            status: item.status,
            azure_devops_id: item.azure_devops_id || null,
            azure_devops_url: item.azure_devops_url || null,
            error_message: item.error_message || null,
        })))
            .select();
        if (error) {
            throw new Error(`Failed to batch create sync history items: ${error.message}`);
        }
        return (data || []).map((row) => this.rowToSyncHistoryItem(row));
    }
    /**
     * List sync history items
     */
    async listSyncHistoryItems(options) {
        const limit = Math.min(options.limit || 100, 500);
        const offset = options.offset || 0;
        let query = supabase_1.supabase
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
            data: (data || []).map((row) => this.rowToSyncHistoryItem(row)),
            total: count || 0,
        };
    }
}
exports.syncHistoryStorage = new SyncHistoryStorage();
//# sourceMappingURL=syncHistoryStorage.js.map