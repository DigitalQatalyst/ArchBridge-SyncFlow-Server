"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogStorage = void 0;
const supabase_1 = require("../db/supabase");
/**
 * Audit Log Storage Service
 */
class AuditLogStorage {
    rowToAuditLog(row) {
        return {
            id: row.id,
            action_type: row.action_type,
            entity_type: row.entity_type,
            entity_id: row.entity_id || undefined,
            user_id: row.user_id || undefined,
            source_ip: row.source_ip || undefined,
            user_agent: row.user_agent || undefined,
            details: row.details || undefined,
            created_at: row.created_at,
        };
    }
    /**
     * Create audit log entry
     */
    async createAuditLog(data) {
        const { data: row, error } = await supabase_1.supabase
            .from("audit_logs")
            .insert({
            action_type: data.action_type,
            entity_type: data.entity_type,
            entity_id: data.entity_id || null,
            user_id: data.user_id || null,
            source_ip: data.source_ip || null,
            user_agent: data.user_agent || null,
            details: data.details || null,
        })
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create audit log: ${error.message}`);
        }
        return this.rowToAuditLog(row);
    }
    /**
     * List audit logs with filters and pagination
     */
    async listAuditLogs(options) {
        const limit = Math.min(options.limit || 50, 100);
        const offset = options.offset || 0;
        let query = supabase_1.supabase.from("audit_logs").select("*", { count: "exact" });
        if (options.action_type) {
            query = query.eq("action_type", options.action_type);
        }
        if (options.entity_type) {
            query = query.eq("entity_type", options.entity_type);
        }
        if (options.entity_id) {
            query = query.eq("entity_id", options.entity_id);
        }
        if (options.start_date) {
            query = query.gte("created_at", options.start_date);
        }
        if (options.end_date) {
            query = query.lte("created_at", options.end_date);
        }
        query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
        const { data, error, count } = await query;
        if (error) {
            throw new Error(`Failed to list audit logs: ${error.message}`);
        }
        return {
            data: (data || []).map((row) => this.rowToAuditLog(row)),
            total: count || 0,
        };
    }
    /**
     * Get audit log statistics
     */
    async getAuditLogStatistics(options) {
        let query = supabase_1.supabase.from("audit_logs").select("*");
        if (options.start_date) {
            query = query.gte("created_at", options.start_date);
        }
        if (options.end_date) {
            query = query.lte("created_at", options.end_date);
        }
        const { data, error } = await query;
        if (error) {
            throw new Error(`Failed to get audit log statistics: ${error.message}`);
        }
        const logs = (data || []);
        const total_events = logs.length;
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const events_today = logs.filter((log) => {
            const logDate = new Date(log.created_at);
            return logDate >= today && logDate < tomorrow;
        }).length;
        // Count by action type
        const action_type_counts = {};
        logs.forEach((log) => {
            action_type_counts[log.action_type] = (action_type_counts[log.action_type] || 0) + 1;
        });
        return {
            total_events,
            events_today,
            action_type_counts,
        };
    }
}
exports.auditLogStorage = new AuditLogStorage();
//# sourceMappingURL=auditLogStorage.js.map