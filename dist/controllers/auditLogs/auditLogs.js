"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogStats = exports.listAuditLogs = void 0;
const auditLogStorage_1 = require("../../services/auditLogStorage");
/**
 * List audit logs
 * GET /api/audit-logs
 */
const listAuditLogs = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
        const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
        const action_type = req.query.action_type;
        const entity_type = req.query.entity_type;
        const start_date = req.query.start_date;
        const end_date = req.query.end_date;
        const entity_id = req.query.entity_id;
        const { data, total } = await auditLogStorage_1.auditLogStorage.listAuditLogs({
            limit,
            offset,
            action_type,
            entity_type,
            start_date,
            end_date,
            entity_id,
        });
        res.json({
            success: true,
            data,
            pagination: {
                total,
                limit,
                offset,
                has_more: offset + limit < total,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || "Failed to list audit logs",
        });
    }
};
exports.listAuditLogs = listAuditLogs;
/**
 * Get audit log statistics
 * GET /api/audit-logs/stats
 */
const getAuditLogStats = async (req, res) => {
    try {
        const start_date = req.query.start_date;
        const end_date = req.query.end_date;
        const stats = await auditLogStorage_1.auditLogStorage.getAuditLogStatistics({
            start_date,
            end_date,
        });
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || "Failed to get audit log statistics",
        });
    }
};
exports.getAuditLogStats = getAuditLogStats;
//# sourceMappingURL=auditLogs.js.map