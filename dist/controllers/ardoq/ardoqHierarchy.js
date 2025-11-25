"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInitiativeHierarchy = exports.getInitiativesForDomain = exports.getDomains = void 0;
const ardoqClientHelper_1 = require("../../services/ardoqClientHelper");
const buildComponentHierarchy_1 = require("../../lib/buildComponentHierarchy");
/**
 * Get all domains in a workspace
 * GET /api/ardoq/workspaces/:workspaceId/domains
 * Query params: Optional configId to use a specific configuration
 *
 * Returns minimal data: { id, name, type } for dropdown usage
 */
const getDomains = async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const configId = req.query.configId;
        const client = await (0, ardoqClientHelper_1.getArdoqClient)(configId);
        // Fetch all components for the workspace
        const response = await client.get("/api/v2/components", {
            rootWorkspace: workspaceId,
        });
        const components = response.values || response.data?.values || [];
        // Filter by type === "Domain"
        const domains = components
            .filter((c) => c.type === "Domain")
            .map((c) => ({
            id: c._id,
            name: c.name,
            type: c.type,
        }));
        res.json({
            success: true,
            data: domains,
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || "Failed to fetch domains",
        });
    }
};
exports.getDomains = getDomains;
/**
 * Get all initiatives for a specific domain
 * GET /api/ardoq/workspaces/:workspaceId/domains/:domainId/initiatives
 * Query params: Optional configId to use a specific configuration
 *
 * Returns minimal data: { id, name, type, parent } for dropdown usage
 */
const getInitiativesForDomain = async (req, res) => {
    try {
        const { workspaceId, domainId } = req.params;
        const configId = req.query.configId;
        const client = await (0, ardoqClientHelper_1.getArdoqClient)(configId);
        // Fetch all components for the workspace
        const response = await client.get("/api/v2/components", {
            rootWorkspace: workspaceId,
        });
        const components = response.values || response.data?.values || [];
        // Filter by type === "Initiative" AND parent === domainId
        const initiatives = components
            .filter((c) => c.type === "Initiative" && c.parent === domainId)
            .map((c) => ({
            id: c._id,
            name: c.name,
            type: c.type,
            parent: c.parent,
        }));
        res.json({
            success: true,
            data: initiatives,
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || "Failed to fetch initiatives",
        });
    }
};
exports.getInitiativesForDomain = getInitiativesForDomain;
/**
 * Get the complete hierarchy for a specific initiative
 * GET /api/ardoq/workspaces/:workspaceId/initiatives/:initiativeId/hierarchy
 * Query params: Optional configId to use a specific configuration
 *
 * Returns full hierarchy: Epics → Features → User Stories
 * Uses buildComponentHierarchy to build the nested structure
 */
const getInitiativeHierarchy = async (req, res) => {
    try {
        const { workspaceId, initiativeId } = req.params;
        const configId = req.query.configId;
        const client = await (0, ardoqClientHelper_1.getArdoqClient)(configId);
        // Fetch all components for the workspace
        const response = await client.get("/api/v2/components", {
            rootWorkspace: workspaceId,
        });
        const allComponents = response.values || response.data?.values || [];
        // Build the hierarchy using buildComponentHierarchy
        const hierarchy = (0, buildComponentHierarchy_1.buildHierarchy)(allComponents, workspaceId);
        // Find the specific initiative in the hierarchy
        let targetInitiative;
        for (const domain of hierarchy) {
            if (domain.children) {
                targetInitiative = domain.children.find((init) => init._id === initiativeId);
                if (targetInitiative)
                    break;
            }
        }
        if (!targetInitiative) {
            res.status(404).json({
                success: false,
                error: `Initiative with id ${initiativeId} not found`,
            });
            return;
        }
        // Return the initiative with its hierarchy (Epics → Features → User Stories)
        res.json({
            success: true,
            data: targetInitiative,
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || "Failed to fetch initiative hierarchy",
        });
    }
};
exports.getInitiativeHierarchy = getInitiativeHierarchy;
//# sourceMappingURL=ardoqHierarchy.js.map