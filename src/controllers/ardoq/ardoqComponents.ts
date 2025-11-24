import { Request, Response } from "express";
import { getArdoqClient } from "../../services/ardoqClientHelper";
import { Component } from "../../lib/buildComponentHierarchy";

/**
 * List all components in a workspace
 * GET /api/ardoq/workspaces/:workspaceId/components
 * Query params: Optional configId to use a specific configuration
 *
 * Fetches all components for the workspace using /api/v2/components?rootWorkspace=:workspaceId
 * Returns all components as a flat array (for use by other endpoints)
 */
export const listComponents = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const configId = req.query.configId as string | undefined;
    const client = await getArdoqClient(configId);

    // Fetch all components for the workspace using rootWorkspace query parameter
    const response = await client.get("/api/v2/components", {
      rootWorkspace: workspaceId,
    });

    // Ardoq API returns components in a values array
    const components: Component[] =
      response.values || response.data?.values || [];

    res.json({
      success: true,
      data: components,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to fetch components",
    });
  }
};
