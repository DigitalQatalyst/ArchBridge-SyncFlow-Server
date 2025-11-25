/**
 * Action type enum
 */
export type ActionType = "sync_started" | "sync_completed" | "sync_failed" | "sync_cancelled" | "config_created" | "config_updated" | "config_deleted" | "config_activated" | "connection_tested";
/**
 * Audit Log interface
 */
export interface AuditLog {
    id: string;
    action_type: ActionType;
    entity_type: string;
    entity_id?: string;
    user_id?: string;
    source_ip?: string;
    user_agent?: string;
    details?: Record<string, any>;
    created_at: string;
}
/**
 * Audit Log Storage Service
 */
declare class AuditLogStorage {
    private rowToAuditLog;
    /**
     * Create audit log entry
     */
    createAuditLog(data: Omit<AuditLog, "id" | "created_at">): Promise<AuditLog>;
    /**
     * List audit logs with filters and pagination
     */
    listAuditLogs(options: {
        limit?: number;
        offset?: number;
        action_type?: ActionType;
        entity_type?: string;
        start_date?: string;
        end_date?: string;
        entity_id?: string;
    }): Promise<{
        data: AuditLog[];
        total: number;
    }>;
    /**
     * Get audit log statistics
     */
    getAuditLogStatistics(options: {
        start_date?: string;
        end_date?: string;
    }): Promise<{
        total_events: number;
        events_today: number;
        action_type_counts: Record<string, number>;
    }>;
}
export declare const auditLogStorage: AuditLogStorage;
export {};
//# sourceMappingURL=auditLogStorage.d.ts.map