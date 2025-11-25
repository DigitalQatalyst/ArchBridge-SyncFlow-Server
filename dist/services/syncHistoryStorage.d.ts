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
    created_at: string;
}
/**
 * Sync History Storage Service
 */
declare class SyncHistoryStorage {
    private rowToSyncHistory;
    private rowToSyncHistoryItem;
    /**
     * Create a new sync history record
     */
    createSyncHistory(data: Omit<SyncHistory, "id" | "created_at" | "updated_at">): Promise<SyncHistory>;
    /**
     * Update sync history record
     */
    updateSyncHistory(id: string, data: Partial<Omit<SyncHistory, "id" | "created_at" | "updated_at">>): Promise<SyncHistory>;
    /**
     * Increment counter fields atomically
     * Fetches current values, adds increments, and updates
     */
    incrementSyncHistoryCounters(id: string, counters: {
        items_created?: number;
        items_failed?: number;
        epics_created?: number;
        epics_failed?: number;
        features_created?: number;
        features_failed?: number;
        user_stories_created?: number;
        user_stories_failed?: number;
        deletion_count?: number;
    }): Promise<SyncHistory>;
    /**
     * Get sync history by ID
     */
    getSyncHistoryById(id: string): Promise<SyncHistory | null>;
    /**
     * List sync history with filters and pagination
     */
    listSyncHistory(options: {
        limit?: number;
        offset?: number;
        status?: SyncStatus;
        source_type?: string;
        target_type?: string;
        start_date?: string;
        end_date?: string;
        project_name?: string;
    }): Promise<{
        data: SyncHistory[];
        total: number;
    }>;
    /**
     * Get sync statistics
     */
    getSyncStatistics(options: {
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
    }>;
    /**
     * Create sync history item
     */
    createSyncHistoryItem(data: Omit<SyncHistoryItem, "id" | "created_at">): Promise<SyncHistoryItem>;
    /**
     * Batch create sync history items
     */
    batchCreateSyncHistoryItems(items: Omit<SyncHistoryItem, "id" | "created_at">[]): Promise<SyncHistoryItem[]>;
    /**
     * List sync history items
     */
    listSyncHistoryItems(options: {
        sync_history_id: string;
        limit?: number;
        offset?: number;
        status?: ItemStatus;
        item_type?: ItemType;
    }): Promise<{
        data: SyncHistoryItem[];
        total: number;
    }>;
}
export declare const syncHistoryStorage: SyncHistoryStorage;
export {};
//# sourceMappingURL=syncHistoryStorage.d.ts.map