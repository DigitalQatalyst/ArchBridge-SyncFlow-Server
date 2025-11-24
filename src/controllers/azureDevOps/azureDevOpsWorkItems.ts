import { Request, Response } from "express";
import { getAzureDevOpsClient } from "../../services/azureDevOpsClientHelper";
import { Component } from "../../lib/buildComponentHierarchy";

interface CreateWorkItemsRequest {
  epics: Component[];
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
 */
function mapArdoqFieldsToAzureDevOps(
  component: Component,
  organization: string,
  parentId?: number
): any[] {
  const patchDocument: any[] = [];

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
    if (
      !["_id", "name", "type", "parent", "children", "description"].includes(
        key
      )
    ) {
      // Map custom fields - adjust field names based on your Azure DevOps process
      // For now, we'll skip non-standard fields or you can add them as custom fields
    }
  });

  return patchDocument;
}

/**
 * Create an Epic work item
 */
async function createEpic(
  client: any,
  project: string,
  epic: Component,
  organization: string
): Promise<{ id: number; url: string } | null> {
  try {
    const patchDocument = mapArdoqFieldsToAzureDevOps(epic, organization);
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
  organization: string
): Promise<{ id: number; url: string } | null> {
  try {
    const patchDocument = mapArdoqFieldsToAzureDevOps(
      feature,
      organization,
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
  organization: string
): Promise<{ id: number; url: string } | null> {
  try {
    const patchDocument = mapArdoqFieldsToAzureDevOps(
      userStory,
      organization,
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

  try {
    const { project } = req.params;
    const configId = req.query.configId as string | undefined;
    const { epics }: CreateWorkItemsRequest = req.body;

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

    // Get configured client
    const client = await getAzureDevOpsClient(configId);
    const config = client.getConfig();
    const organization = config.organization;

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
          organization
        );
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
      } catch (error: any) {
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
          let featureId: number | null = null;
          let featureUrl = "";
          try {
            const featureResult = await createFeature(
              client,
              project,
              feature,
              epicId,
              organization
            );
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
          } catch (error: any) {
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
                const userStoryResult = await createUserStory(
                  client,
                  project,
                  userStory,
                  featureId,
                  organization
                );
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
              } catch (error: any) {
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
  } catch (error: any) {
    sendSSEEvent(res, "sync:error", {
      error: error.message || "Failed to sync work items",
      timestamp: new Date().toISOString(),
    });
    res.end();
  }
};
