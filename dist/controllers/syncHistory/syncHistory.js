"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSyncHistoryStats = exports.getSyncHistoryItems = exports.getSyncHistoryById = exports.listSyncHistory = void 0;
const syncHistoryStorage_1 = require("../../services/syncHistoryStorage");
/**
 * List sync history records
 * GET /api/sync-history
 */
const listSyncHistory = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
        const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
        const status = req.query.status;
        const source_type = req.query.source_type;
        const target_type = req.query.target_type;
        const start_date = req.query.start_date;
        const end_date = req.query.end_date;
        const project_name = req.query.project_name;
        const { data, total } = await syncHistoryStorage_1.syncHistoryStorage.listSyncHistory({
            limit,
            offset,
            status,
            source_type,
            target_type,
            start_date,
            end_date,
            project_name,
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
            error: error.message || "Failed to list sync history",
        });
    }
};
exports.listSyncHistory = listSyncHistory;
/**
 * Get sync history by ID
 * GET /api/sync-history/:id
 */
const getSyncHistoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const syncHistory = await syncHistoryStorage_1.syncHistoryStorage.getSyncHistoryById(id);
        if (!syncHistory) {
            res.status(404).json({
                success: false,
                error: "Sync history not found",
            });
            return;
        }
        res.json({
            success: true,
            data: syncHistory,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || "Failed to get sync history",
        });
    }
};
exports.getSyncHistoryById = getSyncHistoryById;
/**
 * Get sync history items
 * GET /api/sync-history/:id/items
 */
const getSyncHistoryItems = async (req, res) => {
    try {
        const { id } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
        const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
        const status = req.query.status;
        const item_type = req.query.item_type;
        const { data, total } = await syncHistoryStorage_1.syncHistoryStorage.listSyncHistoryItems({
            sync_history_id: id,
            limit,
            offset,
            status,
            item_type,
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
            error: error.message || "Failed to get sync history items",
        });
    }
};
exports.getSyncHistoryItems = getSyncHistoryItems;
/**
 * Get sync history statistics
 * GET /api/sync-history/stats
 */
const getSyncHistoryStats = async (req, res) => {
    try {
        const start_date = req.query.start_date;
        const end_date = req.query.end_date;
        const stats = await syncHistoryStorage_1.syncHistoryStorage.getSyncStatistics({
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
            error: error.message || "Failed to get sync history statistics",
        });
    }
};
exports.getSyncHistoryStats = getSyncHistoryStats;
//# sourceMappingURL=syncHistory.js.map