import { Request, Response } from "express";
import { getAzureDevOpsClient } from "../../services/azureDevOpsClientHelper";
import { Component } from "../../lib/buildComponentHierarchy";
import { syncHistoryStorage } from "../../services/syncHistoryStorage";
import { auditLogStorage } from "../../services/auditLogStorage";
import { configStorage } from "../../services/configStorage";
import { azureDevOpsConfigStorage } from "../../services/azureDevOpsConfigStorage";
import { fieldMappingEngine } from "../../services/fieldMappingEngine";
import { FieldMappingConfig } from "../../types/fieldMapping";

interface CreateWorkItemsRequest {
  epics: Component[];
  fieldMappingConfigId?: string;
}

interface SyncSummary {
  total: number;
  created: number;
  failed: number;
  epics: { total: number; created: number; failed: number };
  features: { total: number; created: number; failed: number };
  userStories: { total: number; created: number; failed: number };
}

/**
 * Map Ardoq component fields to Azure DevOps work item JSON Patch format
 * Uses field mapping engine to apply configured or default mappings
 */
async function mapArdoqFieldsToAzureDevOps(
  component: Component,
  organization: string,
  workItemType: "epic" | "feature" | "user_story",
  fieldMappingConfig: FieldMappingConfig | null,
  parentId?: number
): Promise<any[]> {
  return fieldMappingEngine.applyMappings(
    component,
    workItemType,
    fieldMappingConfig,
    organization,
    parentId
  );
}

/**
 * Create an Epic work item
 */
async function createEpic(
  client: any,
  project: string,
  epic: Component,
  organization: string,
  fieldMappingConfig: FieldMappingConfig | null
): Promise<{ id: number; url: string } | null> {
  try {
    const patchDocument = await mapArdoqFieldsToAzureDevOps(
      epic,
      organization,
      "epic",
      fieldMappingConfig
    );
    const response = await client.createWorkItem(
      project,
      "$Epic",
      patchDocument
    );
    return {
      id: response.id,
      url: response.url || response._links?.html?.href || "",
    };
  } catch (error: any) {
    console.error(`Failed to create epic ${epic._id}:`, error);
    throw error;
  }
}

/**
 * Create a Feature work item with Epic relation
 */
async function createFeature(
  client: any,
  project: string,
  feature: Component,
  epicId: number,
  organization: string,
  fieldMappingConfig: FieldMappingConfig | null
): Promise<{ id: number; url: string } | null> {
  try {
    const patchDocument = await mapArdoqFieldsToAzureDevOps(
      feature,
      organization,
      "feature",
      fieldMappingConfig,
      epicId
    );
    const response = await client.createWorkItem(
      project,
      "$Feature",
      patchDocument
    );
    return {
      id: response.id,
      url: response.url || response._links?.html?.href || "",
    };
  } catch (error: any) {
    console.error(`Failed to create feature ${feature._id}:`, error);
    throw error;
  }
}

/**
 * Create a User Story work item with Feature relation
 */
async function createUserStory(
  client: any,
  project: string,
  userStory: Component,
  featureId: number,
  organization: string,
  fieldMappingConfig: FieldMappingConfig | null
): Promise<{ id: number; url: string } | null> {
  try {
    const patchDocument = await mapArdoqFieldsToAzureDevOps(
      userStory,
      organization,
      "user_story",
      fieldMappingConfig,
      featureId
    );
    const response = await client.createWorkItem(
      project,
      "$User Story",
      patchDocument
    );
    return {
      id: response.id,
      url: response.url || response._links?.html?.href || "",
    };
  } catch (error: any) {
    console.error(`Failed to create user story ${userStory._id}:`, error);
    throw error;
  }
}

/**
 * Send SSE event to client
 */
function sendSSEEvent(res: Response, eventType: string, data: any): void {
  res.write(`event: ${eventType}\n`);
  res.write(`data: ${JSON.stringify({ type: eventType, data })}\n\n`);
}

/**
 * Calculate total items from epics hierarchy
 */
function calculateTotalItems(epics: Component[]): number {
  let total = 0;
  for (const epic of epics) {
    if (epic.type === "Epic") {
      total++; // Epic itself
      if (epic.children) {
        for (const feature of epic.children) {
          if (feature.type === "Feature") {
            total++; // Feature
            if (feature.children) {
              for (const userStory of feature.children) {
                if (userStory.type === "User Story") {
                  total++; // User Story
                }
              }
            }
          }
        }
      }
    }
  }
  return total;
}

/**
 * Map Ardoq type to sync history item type
 */
function mapItemType(ardoqType: string): "epic" | "feature" | "user_story" {
  if (ardoqType === "Epic") return "epic";
  if (ardoqType === "Feature") return "feature";
  if (ardoqType === "User Story") return "user_story";
  throw new Error(`Unknown item type: ${ardoqType}`);
}

/**
 * Delete work items in chunks of 20 to avoid API threshold limits
 * @param client - Azure DevOps client instance
 * @param project - Project ID or name
 * @param workItemIds - Array of work item IDs to delete
 * @param res - Express response object for SSE events
 * @param syncHistoryId - Optional sync history ID to track deletions
 */
async function deleteWorkItemsInChunks(
  client: any,
  project: string,
  workItemIds: number[],
  res: Response,
  syncHistoryId?: string
): Promise<void> {
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

      // Update sync history deletion count if syncHistoryId is provided
      if (syncHistoryId) {
        try {
          await syncHistoryStorage.incrementSyncHistoryCounters(syncHistoryId, {
            deletion_count: chunk.length,
          });
        } catch (error: any) {
          // Log error but don't fail the deletion process
          console.error("Failed to update sync history deletion count:", {
            error: error?.message || String(error),
            stack: error?.stack,
            details: error?.details || error?.hint || error,
            syncHistoryId,
            chunkSize: chunk.length,
          });
        }
      }

      // Emit progress event after successful deletion
      sendSSEEvent(res, "overwrite:progress", {
        message: `Deleted chunk ${currentChunk} of ${totalChunks} (${chunk.length} items)`,
        deleted: deleted,
        total: total,
        currentChunk: currentChunk,
        totalChunks: totalChunks,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
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
export const checkWorkItems = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { project } = req.params;
    const configId = req.query.configId as string | undefined;

    // Validation
    if (
      !project ||
      typeof project !== "string" ||
      project.trim().length === 0
    ) {
      res.status(400).json({
        success: false,
        error: "Project parameter is required and must be a non-empty string",
      });
      return;
    }

    // Get configured client
    const client = await getAzureDevOpsClient(configId);

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
        workItemIds: workItems.map((wi: any) => wi.id),
      },
    });
  } catch (error: any) {
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

/**
 * Create work items from Ardoq hierarchy
 * POST /api/azure-devops/projects/:project/workitems?configId=xxx
 * Uses Server-Sent Events (SSE) to stream progress updates
 */
export const createWorkItems = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable buffering for nginx

  let syncHistoryId: string | undefined;
  const startedAt = new Date();

  try {
    const { project } = req.params;
    const configId = req.query.configId as string | undefined;
    const sourceConfigId = req.query.sourceConfigId as string | undefined; // Optional Ardoq config ID
    const overwrite = req.query.overwrite === "true" || req.query.overwrite === true;
    const { epics, fieldMappingConfigId }: CreateWorkItemsRequest = req.body;

    // Validation
    if (
      !project ||
      typeof project !== "string" ||
      project.trim().length === 0
    ) {
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

    // Get source config (Ardoq) - use provided ID or active config
    let sourceConfigIdFinal: string | undefined;
    try {
      if (sourceConfigId) {
        const sourceConfig = await configStorage.getConfigurationById(sourceConfigId);
        if (sourceConfig) {
          sourceConfigIdFinal = sourceConfig.id;
        }
      } else {
        const activeSourceConfig = await configStorage.getActiveConfiguration();
        if (activeSourceConfig) {
          sourceConfigIdFinal = activeSourceConfig.id;
        }
      }
    } catch (error) {
      // Log but don't fail - source config is optional for sync history
      console.warn("Could not get source config for sync history:", error);
    }

    // Get target config (Azure DevOps) - use provided ID or active config
    let targetConfigIdFinal: string | undefined;
    try {
      if (configId) {
        const targetConfig = await azureDevOpsConfigStorage.getConfigurationById(configId);
        if (targetConfig) {
          targetConfigIdFinal = targetConfig.id;
        }
      } else {
        const activeTargetConfig = await azureDevOpsConfigStorage.getActiveConfiguration();
        if (activeTargetConfig) {
          targetConfigIdFinal = activeTargetConfig.id;
        }
      }
    } catch (error) {
      // Log but don't fail - target config is optional for sync history
      console.warn("Could not get target config for sync history:", error);
    }

    // Calculate total items
    const totalItems = calculateTotalItems(epics);

    // Create sync history record
    console.log("[Sync History] Attempting to create sync history record...", {
      source_type: "ardoq",
      source_config_id: sourceConfigIdFinal,
      target_type: "azure-devops",
      target_config_id: targetConfigIdFinal,
      project_name: project,
      total_items: totalItems,
    });
    
    try {
      const syncHistory = await syncHistoryStorage.createSyncHistory({
        source_type: "ardoq",
        source_config_id: sourceConfigIdFinal,
        target_type: "azure-devops",
        target_config_id: targetConfigIdFinal,
        project_name: project,
        status: "pending",
        overwrite_mode: overwrite,
        total_items: totalItems,
        items_created: 0,
        items_failed: 0,
        epics_created: 0,
        epics_failed: 0,
        features_created: 0,
        features_failed: 0,
        user_stories_created: 0,
        user_stories_failed: 0,
        deletion_count: 0,
        started_at: startedAt.toISOString(),
      });
      syncHistoryId = syncHistory.id;
      console.log("[Sync History] Successfully created sync history record:", syncHistoryId);

      // Create audit log for sync started
      console.log("[Audit Log] Attempting to create audit log for sync_started...", {
        syncHistoryId,
      });
      try {
        const auditLog = await auditLogStorage.createAuditLog({
          action_type: "sync_started",
          entity_type: "sync",
          entity_id: syncHistoryId,
          source_ip: req.ip || req.headers["x-forwarded-for"] as string || undefined,
          user_agent: req.headers["user-agent"] || undefined,
          details: {
            source_type: "ardoq",
            target_type: "azure-devops",
            project_name: project,
            overwrite_mode: overwrite,
            total_items: totalItems,
          },
        });
        console.log("[Audit Log] Successfully created audit log:", auditLog.id);
      } catch (error: any) {
        console.error("[Audit Log] Failed to create audit log for sync_started:", {
          error: error?.message || String(error),
          stack: error?.stack,
          details: error?.details || error?.hint || error,
          code: error?.code,
          fullError: error,
        });
      }
    } catch (error: any) {
      console.error("[Sync History] Failed to create sync history:", {
        error: error?.message || String(error),
        stack: error?.stack,
        details: error?.details || error?.hint || error,
        code: error?.code,
        fullError: error,
      });
      // Continue with sync even if history creation fails
    }

    // Update status to in_progress
    if (syncHistoryId) {
      console.log("[Sync History] Updating status to in_progress...", { syncHistoryId });
      try {
        await syncHistoryStorage.updateSyncHistory(syncHistoryId, {
          status: "in_progress",
        });
        console.log("[Sync History] Successfully updated status to in_progress");
      } catch (error: any) {
        console.error("[Sync History] Failed to update sync history status:", {
          error: error?.message || String(error),
          stack: error?.stack,
          details: error?.details || error?.hint || error,
          syncHistoryId,
          fullError: error,
        });
      }
    } else {
      console.warn("[Sync History] No syncHistoryId available, skipping status update");
    }

    // Get configured client
    const client = await getAzureDevOpsClient(configId);
    const config = client.getConfig();
    const organization = config.organization;

    // Load field mapping configuration
    let fieldMappingConfig: FieldMappingConfig | null = null;
    try {
      fieldMappingConfig = await fieldMappingEngine.loadConfiguration(
        fieldMappingConfigId,
        project
      );
      if (fieldMappingConfig) {
        console.log(
          `Using field mapping configuration: ${fieldMappingConfig.name} (${fieldMappingConfig.id})`
        );
      } else {
        console.log("Using default field mappings");
      }
    } catch (error) {
      console.warn(
        "Failed to load field mapping configuration, using defaults:",
        error
      );
      // Continue with default mappings
    }

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
        const workItemIds = existingWorkItems.map((wi: any) => wi.id);

        // Delete work items in chunks of 20
        await deleteWorkItemsInChunks(client, project, workItemIds, res, syncHistoryId);
      } catch (error: any) {
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
    const summary: SyncSummary = {
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
      let epicId: number | null = null;
      let epicUrl = "";
      try {
        const epicResult = await createEpic(
          client,
          project,
          epic,
          organization,
          fieldMappingConfig
        );
        if (epicResult) {
          epicId = epicResult.id;
          epicUrl = epicResult.url;
          summary.epics.created++;
          summary.created++;

          // Create sync history item
          if (syncHistoryId) {
            try {
              await syncHistoryStorage.createSyncHistoryItem({
                sync_history_id: syncHistoryId,
                ardoq_id: epic._id,
                item_name: epic.name || "Untitled",
                item_type: mapItemType(epic.type),
                status: "created",
                azure_devops_id: epicId,
                azure_devops_url: epicUrl,
              });

              // Update counters
              await syncHistoryStorage.incrementSyncHistoryCounters(syncHistoryId, {
                items_created: 1,
                epics_created: 1,
              });
            } catch (error: any) {
              console.error("Failed to create sync history item for epic:", {
                error: error?.message || String(error),
                stack: error?.stack,
                details: error?.details || error?.hint || error,
                epicId: epic._id,
                syncHistoryId,
              });
            }
          }

          sendSSEEvent(res, "epic:created", {
            ardoqId: epic._id,
            name: epic.name,
            azureDevOpsId: epicId,
            azureDevOpsUrl: epicUrl,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error: any) {
        summary.epics.failed++;
        summary.failed++;

        // Create sync history item for failed epic
        if (syncHistoryId) {
          try {
            await syncHistoryStorage.createSyncHistoryItem({
              sync_history_id: syncHistoryId,
              ardoq_id: epic._id,
              item_name: epic.name || "Untitled",
              item_type: mapItemType(epic.type),
              status: "failed",
              error_message: error.message || "Failed to create epic",
            });

            // Update counters
            await syncHistoryStorage.incrementSyncHistoryCounters(syncHistoryId, {
              items_failed: 1,
              epics_failed: 1,
            });
          } catch (historyError: any) {
            console.error("Failed to create sync history item for failed epic:", {
              error: historyError?.message || String(historyError),
              stack: historyError?.stack,
              details: historyError?.details || historyError?.hint || historyError,
              epicId: epic._id,
              syncHistoryId,
            });
          }
        }

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
          let featureId: number | null = null;
          let featureUrl = "";
          try {
            const featureResult = await createFeature(
              client,
              project,
              feature,
              epicId,
              organization,
              fieldMappingConfig
            );
            if (featureResult) {
              featureId = featureResult.id;
              featureUrl = featureResult.url;
              summary.features.created++;
              summary.created++;

              // Create sync history item
              if (syncHistoryId) {
                try {
                  await syncHistoryStorage.createSyncHistoryItem({
                    sync_history_id: syncHistoryId,
                    ardoq_id: feature._id,
                    item_name: feature.name || "Untitled",
                    item_type: mapItemType(feature.type),
                    status: "created",
                    azure_devops_id: featureId,
                    azure_devops_url: featureUrl,
                  });

                  // Update counters
                  await syncHistoryStorage.incrementSyncHistoryCounters(syncHistoryId, {
                    items_created: 1,
                    features_created: 1,
                  });
                } catch (error: any) {
                  console.error("Failed to create sync history item for feature:", {
                    error: error?.message || String(error),
                    stack: error?.stack,
                    details: error?.details || error?.hint || error,
                    featureId: feature._id,
                    syncHistoryId,
                  });
                }
              }

              sendSSEEvent(res, "feature:created", {
                ardoqId: feature._id,
                name: feature.name,
                azureDevOpsId: featureId,
                azureDevOpsUrl: featureUrl,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (error: any) {
            summary.features.failed++;
            summary.failed++;

            // Create sync history item for failed feature
            if (syncHistoryId) {
              try {
                await syncHistoryStorage.createSyncHistoryItem({
                  sync_history_id: syncHistoryId,
                  ardoq_id: feature._id,
                  item_name: feature.name || "Untitled",
                  item_type: mapItemType(feature.type),
                  status: "failed",
                  error_message: error.message || "Failed to create feature",
                });

                // Update counters
                await syncHistoryStorage.incrementSyncHistoryCounters(syncHistoryId, {
                  items_failed: 1,
                  features_failed: 1,
                });
              } catch (historyError: any) {
                console.error("Failed to create sync history item for failed feature:", {
                  error: historyError?.message || String(historyError),
                  stack: historyError?.stack,
                  details: historyError?.details || historyError?.hint || historyError,
                  featureId: feature._id,
                  syncHistoryId,
                });
              }
            }

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
                const userStoryResult = await createUserStory(
                  client,
                  project,
                  userStory,
                  featureId,
                  organization,
                  fieldMappingConfig
                );
                if (userStoryResult) {
                  summary.userStories.created++;
                  summary.created++;

                  // Create sync history item
                  if (syncHistoryId) {
                    try {
                      await syncHistoryStorage.createSyncHistoryItem({
                        sync_history_id: syncHistoryId,
                        ardoq_id: userStory._id,
                        item_name: userStory.name || "Untitled",
                        item_type: mapItemType(userStory.type),
                        status: "created",
                        azure_devops_id: userStoryResult.id,
                        azure_devops_url: userStoryResult.url,
                      });

                      // Update counters
                      await syncHistoryStorage.incrementSyncHistoryCounters(syncHistoryId, {
                        items_created: 1,
                        user_stories_created: 1,
                      });
                    } catch (error: any) {
                      console.error("Failed to create sync history item for user story:", {
                        error: error?.message || String(error),
                        stack: error?.stack,
                        details: error?.details || error?.hint || error,
                        userStoryId: userStory._id,
                        syncHistoryId,
                      });
                    }
                  }

                  sendSSEEvent(res, "userstory:created", {
                    ardoqId: userStory._id,
                    name: userStory.name,
                    azureDevOpsId: userStoryResult.id,
                    azureDevOpsUrl: userStoryResult.url,
                    timestamp: new Date().toISOString(),
                  });
                }
              } catch (error: any) {
                summary.userStories.failed++;
                summary.failed++;

                // Create sync history item for failed user story
                if (syncHistoryId) {
                  try {
                    await syncHistoryStorage.createSyncHistoryItem({
                      sync_history_id: syncHistoryId,
                      ardoq_id: userStory._id,
                      item_name: userStory.name || "Untitled",
                      item_type: mapItemType(userStory.type),
                      status: "failed",
                      error_message: error.message || "Failed to create user story",
                    });

                    // Update counters
                    await syncHistoryStorage.incrementSyncHistoryCounters(syncHistoryId, {
                      items_failed: 1,
                      user_stories_failed: 1,
                    });
                  } catch (historyError: any) {
                    console.error("Failed to create sync history item for failed user story:", {
                      error: historyError?.message || String(historyError),
                      stack: historyError?.stack,
                      details: historyError?.details || historyError?.hint || historyError,
                      userStoryId: userStory._id,
                      syncHistoryId,
                    });
                  }
                }

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

    // Update sync history on completion
    if (syncHistoryId) {
      console.log("[Sync History] Updating sync history on completion...", {
        syncHistoryId,
        summary,
      });
      try {
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();

        await syncHistoryStorage.updateSyncHistory(syncHistoryId, {
          status: "completed",
          completed_at: completedAt.toISOString(),
          duration_ms: durationMs,
        });
        console.log("[Sync History] Successfully updated sync history to completed");

        // Create audit log for sync completed
        console.log("[Audit Log] Creating audit log for sync_completed...");
        try {
          const auditLog = await auditLogStorage.createAuditLog({
            action_type: "sync_completed",
            entity_type: "sync",
            entity_id: syncHistoryId,
            source_ip: req.ip || req.headers["x-forwarded-for"] as string || undefined,
            user_agent: req.headers["user-agent"] || undefined,
            details: {
              total_items: summary.total,
              items_created: summary.created,
              items_failed: summary.failed,
            },
          });
          console.log("[Audit Log] Successfully created audit log for sync_completed:", auditLog.id);
        } catch (error: any) {
          console.error("[Audit Log] Failed to create audit log for sync_completed:", {
            error: error?.message || String(error),
            stack: error?.stack,
            details: error?.details || error?.hint || error,
            code: error?.code,
            syncHistoryId,
            fullError: error,
          });
        }
      } catch (error: any) {
        console.error("[Sync History] Failed to update sync history on completion:", {
          error: error?.message || String(error),
          stack: error?.stack,
          details: error?.details || error?.hint || error,
          code: error?.code,
          syncHistoryId,
          fullError: error,
        });
      }
    } else {
      console.warn("[Sync History] No syncHistoryId available, skipping completion update");
    }

    // Send completion event
    sendSSEEvent(res, "sync:complete", {
      summary,
      timestamp: new Date().toISOString(),
    });

    res.end();
  } catch (error: any) {
    // Update sync history on failure
    if (syncHistoryId) {
      try {
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();

        await syncHistoryStorage.updateSyncHistory(syncHistoryId, {
          status: "failed",
          completed_at: completedAt.toISOString(),
          duration_ms: durationMs,
          error_message: error.message || "Failed to sync work items",
        });

        // Create audit log for sync failed
        try {
          await auditLogStorage.createAuditLog({
            action_type: "sync_failed",
            entity_type: "sync",
            entity_id: syncHistoryId,
            source_ip: req.ip || req.headers["x-forwarded-for"] as string || undefined,
            user_agent: req.headers["user-agent"] || undefined,
            details: {
              error: error.message || "Failed to sync work items",
            },
          });
        } catch (auditError: any) {
          console.error("Failed to create audit log for sync_failed:", {
            error: auditError?.message || String(auditError),
            stack: auditError?.stack,
            details: auditError?.details || auditError?.hint || auditError,
            syncHistoryId,
          });
        }
      } catch (historyError: any) {
        console.error("Failed to update sync history on failure:", {
          error: historyError?.message || String(historyError),
          stack: historyError?.stack,
          details: historyError?.details || historyError?.hint || historyError,
          syncHistoryId,
        });
      }
    }

    sendSSEEvent(res, "sync:error", {
      error: error.message || "Failed to sync work items",
      timestamp: new Date().toISOString(),
    });
    res.end();
  }
};
