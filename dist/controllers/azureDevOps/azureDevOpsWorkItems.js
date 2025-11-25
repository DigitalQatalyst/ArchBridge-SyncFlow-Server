"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWorkItems = exports.checkWorkItems = void 0;
const azureDevOpsClientHelper_1 = require("../../services/azureDevOpsClientHelper");
/**
 * Map Ardoq component fields to Azure DevOps work item JSON Patch format
 */
function mapArdoqFieldsToAzureDevOps(component, organization, parentId) {
    const patchDocument = [];
    // Add title (required field)
    patchDocument.push({
        op: "add",
        path: "/fields/System.Title",
        value: component.name || "Untitled",
    });
    // Add description if available
    if (component.description) {
        patchDocument.push({
            op: "add",
            path: "/fields/System.Description",
            value: component.description,
        });
    }
    // Add parent-child relationship if parent exists
    if (parentId) {
        patchDocument.push({
            op: "add",
            path: "/relations/-",
            value: {
                rel: "System.LinkTypes.Hierarchy-Reverse",
                url: `https://dev.azure.com/${organization}/_apis/wit/workitems/${parentId}`,
            },
        });
    }
    // Map additional Ardoq fields to custom fields or standard fields
    // You can extend this to map more fields as needed
    Object.keys(component).forEach((key) => {
        if (!["_id", "name", "type", "parent", "children", "description"].includes(key)) {
            // Map custom fields - adjust field names based on your Azure DevOps process
            // For now, we'll skip non-standard fields or you can add them as custom fields
        }
    });
    return patchDocument;
}
/**
 * Create an Epic work item
 */
async function createEpic(client, project, epic, organization) {
    try {
        const patchDocument = mapArdoqFieldsToAzureDevOps(epic, organization);
        const response = await client.createWorkItem(project, "$Epic", patchDocument);
        return {
            id: response.id,
            url: response.url || response._links?.html?.href || "",
        };
    }
    catch (error) {
        console.error(`Failed to create epic ${epic._id}:`, error);
        throw error;
    }
}
/**
 * Create a Feature work item with Epic relation
 */
async function createFeature(client, project, feature, epicId, organization) {
    try {
        const patchDocument = mapArdoqFieldsToAzureDevOps(feature, organization, epicId);
        const response = await client.createWorkItem(project, "$Feature", patchDocument);
        return {
            id: response.id,
            url: response.url || response._links?.html?.href || "",
        };
    }
    catch (error) {
        console.error(`Failed to create feature ${feature._id}:`, error);
        throw error;
    }
}
/**
 * Create a User Story work item with Feature relation
 */
async function createUserStory(client, project, userStory, featureId, organization) {
    try {
        const patchDocument = mapArdoqFieldsToAzureDevOps(userStory, organization, featureId);
        const response = await client.createWorkItem(project, "$User Story", patchDocument);
        return {
            id: response.id,
            url: response.url || response._links?.html?.href || "",
        };
    }
    catch (error) {
        console.error(`Failed to create user story ${userStory._id}:`, error);
        throw error;
    }
}
/**
 * Send SSE event to client
 */
function sendSSEEvent(res, eventType, data) {
    res.write(`event: ${eventType}\n`);
    res.write(`data: ${JSON.stringify({ type: eventType, data })}\n\n`);
}
/**
 * Delete work items in chunks of 20 to avoid API threshold limits
 * @param client - Azure DevOps client instance
 * @param project - Project ID or name
 * @param workItemIds - Array of work item IDs to delete
 * @param res - Express response object for SSE events
 */
async function deleteWorkItemsInChunks(client, project, workItemIds, res) {
    const CHUNK_SIZE = 20;
    const total = workItemIds.length;
    const totalChunks = Math.ceil(total / CHUNK_SIZE);
    let deleted = 0;
    if (total === 0) {
        sendSSEEvent(res, "overwrite:no-items", {
            message: "No existing work items found. Proceeding with creation.",
            timestamp: new Date().toISOString(),
        });
        return;
    }
    // Emit deleting event with total count
    sendSSEEvent(res, "overwrite:deleting", {
        message: `Found ${total} existing work items. Deleting in chunks of ${CHUNK_SIZE}...`,
        count: total,
        timestamp: new Date().toISOString(),
    });
    // Process in chunks
    for (let i = 0; i < workItemIds.length; i += CHUNK_SIZE) {
        const chunk = workItemIds.slice(i, i + CHUNK_SIZE);
        const currentChunk = Math.floor(i / CHUNK_SIZE) + 1;
        try {
            // Delete this chunk (permanently with destroy=true)
            await client.deleteWorkItems(project, chunk, true);
            deleted += chunk.length;
            // Emit progress event after successful deletion
            sendSSEEvent(res, "overwrite:progress", {
                message: `Deleted chunk ${currentChunk} of ${totalChunks} (${chunk.length} items)`,
                deleted: deleted,
                total: total,
                currentChunk: currentChunk,
                totalChunks: totalChunks,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            // Emit error and abort
            sendSSEEvent(res, "overwrite:error", {
                error: error.message || "Failed to delete work items",
                message: "Overwrite operation failed. Aborting work item creation.",
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }
    // Emit completion event
    sendSSEEvent(res, "overwrite:deleted", {
        message: `Successfully deleted ${total} existing work items`,
        count: total,
        timestamp: new Date().toISOString(),
    });
}
/**
 * Check if a project has work items
 * GET /api/azure-devops/projects/:project/workitems/check?configId=xxx
 * Query params: configId (optional) - If provided, uses that configuration. If omitted, uses active configuration.
 */
const checkWorkItems = async (req, res) => {
    try {
        const { project } = req.params;
        const configId = req.query.configId;
        // Validation
        if (!project ||
            typeof project !== "string" ||
            project.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: "Project parameter is required and must be a non-empty string",
            });
            return;
        }
        // Get configured client
        const client = await (0, azureDevOpsClientHelper_1.getAzureDevOpsClient)(configId);
        // Query for work items in the project using WIQL
        // Using System.TeamProject field to filter by project
        const wiql = `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${project}'`;
        const queryResult = await client.queryWorkItems(project, wiql);
        // Extract work items from query result
        const workItems = queryResult.workItems || [];
        const hasWorkItems = workItems.length > 0;
        const count = workItems.length;
        res.json({
            success: true,
            data: {
                hasWorkItems,
                count,
                workItemIds: workItems.map((wi) => wi.id),
            },
        });
    }
    catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message || "Failed to check work items",
            details: error.statusCode
                ? `HTTP ${error.statusCode}: ${error.message || "Failed to check work items"}`
                : "Failed to check work items",
        });
    }
};
exports.checkWorkItems = checkWorkItems;
/**
 * Create work items from Ardoq hierarchy
 * POST /api/azure-devops/projects/:project/workitems?configId=xxx
 * Uses Server-Sent Events (SSE) to stream progress updates
 */
const createWorkItems = async (req, res) => {
    // Set up SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable buffering for nginx
    try {
        const { project } = req.params;
        const configId = req.query.configId;
        const overwrite = req.query.overwrite === "true" || req.query.overwrite === true;
        const { epics } = req.body;
        // Validation
        if (!project ||
            typeof project !== "string" ||
            project.trim().length === 0) {
            sendSSEEvent(res, "sync:error", {
                error: "Project parameter is required and must be a non-empty string",
                timestamp: new Date().toISOString(),
            });
            res.end();
            return;
        }
        if (!epics || !Array.isArray(epics) || epics.length === 0) {
            sendSSEEvent(res, "sync:error", {
                error: "epics array is required and must not be empty",
                timestamp: new Date().toISOString(),
            });
            res.end();
            return;
        }
        // Get configured client
        const client = await (0, azureDevOpsClientHelper_1.getAzureDevOpsClient)(configId);
        const config = client.getConfig();
        const organization = config.organization;
        // Handle overwrite mode: delete all existing work items before creating new ones
        if (overwrite) {
            try {
                sendSSEEvent(res, "overwrite:started", {
                    message: "Overwrite mode enabled. Checking for existing work items...",
                    timestamp: new Date().toISOString(),
                });
                // Query for all existing work items in the project
                const wiql = `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${project}'`;
                const queryResult = await client.queryWorkItems(project, wiql);
                const existingWorkItems = queryResult.workItems || [];
                const workItemIds = existingWorkItems.map((wi) => wi.id);
                // Delete work items in chunks of 20
                await deleteWorkItemsInChunks(client, project, workItemIds, res);
            }
            catch (error) {
                sendSSEEvent(res, "overwrite:error", {
                    error: error.message || "Failed to delete existing work items",
                    message: "Overwrite operation failed. Aborting work item creation.",
                    timestamp: new Date().toISOString(),
                });
                res.end();
                return;
            }
        }
        // Initialize summary counters
        const summary = {
            total: 0,
            created: 0,
            failed: 0,
            epics: { total: 0, created: 0, failed: 0 },
            features: { total: 0, created: 0, failed: 0 },
            userStories: { total: 0, created: 0, failed: 0 },
        };
        // Process each epic sequentially
        for (const epic of epics) {
            if (epic.type !== "Epic") {
                continue; // Skip non-epic items
            }
            summary.epics.total++;
            summary.total++;
            // Create Epic
            let epicId = null;
            let epicUrl = "";
            try {
                const epicResult = await createEpic(client, project, epic, organization);
                if (epicResult) {
                    epicId = epicResult.id;
                    epicUrl = epicResult.url;
                    summary.epics.created++;
                    summary.created++;
                    sendSSEEvent(res, "epic:created", {
                        ardoqId: epic._id,
                        name: epic.name,
                        azureDevOpsId: epicId,
                        azureDevOpsUrl: epicUrl,
                        timestamp: new Date().toISOString(),
                    });
                }
            }
            catch (error) {
                summary.epics.failed++;
                summary.failed++;
                sendSSEEvent(res, "epic:failed", {
                    ardoqId: epic._id,
                    name: epic.name,
                    error: error.message || "Failed to create epic",
                    timestamp: new Date().toISOString(),
                });
                continue; // Skip features and user stories if epic creation failed
            }
            // Process features for this epic
            if (epic.children && epicId) {
                for (const feature of epic.children) {
                    if (feature.type !== "Feature") {
                        continue;
                    }
                    summary.features.total++;
                    summary.total++;
                    // Create Feature
                    let featureId = null;
                    let featureUrl = "";
                    try {
                        const featureResult = await createFeature(client, project, feature, epicId, organization);
                        if (featureResult) {
                            featureId = featureResult.id;
                            featureUrl = featureResult.url;
                            summary.features.created++;
                            summary.created++;
                            sendSSEEvent(res, "feature:created", {
                                ardoqId: feature._id,
                                name: feature.name,
                                azureDevOpsId: featureId,
                                azureDevOpsUrl: featureUrl,
                                timestamp: new Date().toISOString(),
                            });
                        }
                    }
                    catch (error) {
                        summary.features.failed++;
                        summary.failed++;
                        sendSSEEvent(res, "feature:failed", {
                            ardoqId: feature._id,
                            name: feature.name,
                            error: error.message || "Failed to create feature",
                            timestamp: new Date().toISOString(),
                        });
                        continue; // Skip user stories if feature creation failed
                    }
                    // Process user stories for this feature
                    if (feature.children && featureId) {
                        for (const userStory of feature.children) {
                            if (userStory.type !== "User Story") {
                                continue;
                            }
                            summary.userStories.total++;
                            summary.total++;
                            // Create User Story
                            try {
                                const userStoryResult = await createUserStory(client, project, userStory, featureId, organization);
                                if (userStoryResult) {
                                    summary.userStories.created++;
                                    summary.created++;
                                    sendSSEEvent(res, "userstory:created", {
                                        ardoqId: userStory._id,
                                        name: userStory.name,
                                        azureDevOpsId: userStoryResult.id,
                                        azureDevOpsUrl: userStoryResult.url,
                                        timestamp: new Date().toISOString(),
                                    });
                                }
                            }
                            catch (error) {
                                summary.userStories.failed++;
                                summary.failed++;
                                sendSSEEvent(res, "userstory:failed", {
                                    ardoqId: userStory._id,
                                    name: userStory.name,
                                    error: error.message || "Failed to create user story",
                                    timestamp: new Date().toISOString(),
                                });
                            }
                        }
                    }
                }
            }
        }
        // Send completion event
        sendSSEEvent(res, "sync:complete", {
            summary,
            timestamp: new Date().toISOString(),
        });
        res.end();
    }
    catch (error) {
        sendSSEEvent(res, "sync:error", {
            error: error.message || "Failed to sync work items",
            timestamp: new Date().toISOString(),
        });
        res.end();
    }
};
exports.createWorkItems = createWorkItems;
//# sourceMappingURL=azureDevOpsWorkItems.js.map