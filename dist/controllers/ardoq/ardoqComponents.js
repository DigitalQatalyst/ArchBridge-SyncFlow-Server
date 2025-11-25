"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listComponents = void 0;
const ardoqClientHelper_1 = require("../../services/ardoqClientHelper");
/**
 * List all components in a workspace
 * GET /api/ardoq/workspaces/:workspaceId/components
 * Query params: Optional configId to use a specific configuration
 *
 * Fetches all components for the workspace using /api/v2/components?rootWorkspace=:workspaceId
 * Returns all components as a flat array (for use by other endpoints)
 */
const listComponents = async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const configId = req.query.configId;
        const client = await (0, ardoqClientHelper_1.getArdoqClient)(configId);
        // Fetch all components for the workspace using rootWorkspace query parameter
        const response = await client.get("/api/v2/components", {
            rootWorkspace: workspaceId,
        });
        // Ardoq API returns components in a values array
        const components = response.values || response.data?.values || [];
        res.json({
            success: true,
            data: components,
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || "Failed to fetch components",
        });
    }
};
exports.listComponents = listComponents;
//# sourceMappingURL=ardoqComponents.js.map