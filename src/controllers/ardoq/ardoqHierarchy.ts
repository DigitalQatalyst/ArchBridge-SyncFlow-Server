import { Request, Response } from "express";
import { getArdoqClient } from "../../services/ardoqClientHelper";
import { Component, buildHierarchy } from "../../lib/buildComponentHierarchy";

/**
 * Get all domains in a workspace
 * GET /api/ardoq/workspaces/:workspaceId/domains
 * Query params: Optional configId to use a specific configuration
 *
 * Returns minimal data: { id, name, type } for dropdown usage
 */
export const getDomains = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const configId = req.query.configId as string | undefined;
    const client = await getArdoqClient(configId);

    // Fetch all components for the workspace
    const response = await client.get("/api/v2/components", {
      rootWorkspace: workspaceId,
    });

    const components: Component[] =
      response.values || response.data?.values || [];

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
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to fetch domains",
    });
  }
};

/**
 * Get all initiatives for a specific domain
 * GET /api/ardoq/workspaces/:workspaceId/domains/:domainId/initiatives
 * Query params: Optional configId to use a specific configuration
 *
 * Returns minimal data: { id, name, type, parent } for dropdown usage
 */
export const getInitiativesForDomain = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { workspaceId, domainId } = req.params;
    const configId = req.query.configId as string | undefined;
    const client = await getArdoqClient(configId);
    console.log(workspaceId, domainId);

    // Fetch all components for the workspace
    const response = await client.get("/api/v2/components", {
      rootWorkspace: workspaceId,
    });

    const components: Component[] =
      response.values || response.data?.values || [];

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
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to fetch initiatives",
    });
  }
};

/**
 * Get the complete hierarchy for a specific initiative
 * GET /api/ardoq/workspaces/:workspaceId/initiatives/:initiativeId/hierarchy
 * Query params: Optional configId to use a specific configuration
 *
 * Returns full hierarchy: Epics → Features → User Stories
 * Uses buildComponentHierarchy to build the nested structure
 */
export const getInitiativeHierarchy = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { workspaceId, initiativeId } = req.params;
    const configId = req.query.configId as string | undefined;
    const client = await getArdoqClient(configId);

    // Fetch all components for the workspace
    const response = await client.get("/api/v2/components", {
      rootWorkspace: workspaceId,
    });

    const allComponents: Component[] =
      response.values || response.data?.values || [];

    // Build the hierarchy using buildComponentHierarchy
    const hierarchy = buildHierarchy(allComponents, workspaceId);

    // Find the specific initiative in the hierarchy
    let targetInitiative: Component | undefined;
    for (const domain of hierarchy) {
      if (domain.children) {
        targetInitiative = domain.children.find(
          (init) => init._id === initiativeId
        );
        if (targetInitiative) break;
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
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to fetch initiative hierarchy",
    });
  }
};
