"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkspaceContext = exports.getWorkspace = exports.listWorkspaces = void 0;
const ardoqClientHelper_1 = require("../../services/ardoqClientHelper");
/**
 * List all workspaces
 * GET /api/ardoq/workspaces
 * Query params: Optional Ardoq API query parameters, optional configId to use a specific configuration
 */
const listWorkspaces = async (req, res) => {
    try {
        const { configId, ...queryParams } = req.query;
        const client = await (0, ardoqClientHelper_1.getArdoqClient)(configId);
        const data = await client.get("/api/v2/workspaces", queryParams);
        res.json({
            success: true,
            data,
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || "Failed to fetch workspaces",
        });
    }
};
exports.listWorkspaces = listWorkspaces;
/**
 * Get a specific workspace by ID
 * GET /api/ardoq/workspaces/:id
 */
const getWorkspace = async (req, res) => {
    try {
        const { id } = req.params;
        const configId = req.query.configId;
        const client = await (0, ardoqClientHelper_1.getArdoqClient)(configId);
        const data = await client.get(`/api/v2/workspaces/${id}`);
        res.json({
            success: true,
            data,
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || "Failed to fetch workspace",
        });
    }
};
exports.getWorkspace = getWorkspace;
/**
 * Get workspace context
 * GET /api/ardoq/workspaces/:id/context
 * Returns metadata about the workspace including component types, reference types, etc.
 */
const getWorkspaceContext = async (req, res) => {
    try {
        const { id } = req.params;
        const configId = req.query.configId;
        const client = await (0, ardoqClientHelper_1.getArdoqClient)(configId);
        const data = await client.get(`/api/v2/workspaces/${id}/context`);
        res.json({
            success: true,
            data,
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || "Failed to fetch workspace context",
        });
    }
};
exports.getWorkspaceContext = getWorkspaceContext;
//# sourceMappingURL=ardoqWorkspaces.js.map