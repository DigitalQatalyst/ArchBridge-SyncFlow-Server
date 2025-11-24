import { Request, Response } from "express";
import { getArdoqClient } from "../../services/ardoqClientHelper";

/**
 * List all workspaces
 * GET /api/ardoq/workspaces
 * Query params: Optional Ardoq API query parameters, optional configId to use a specific configuration
 */
export const listWorkspaces = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { configId, ...queryParams } = req.query as Record<string, string>;
    const client = await getArdoqClient(configId);
    const data = await client.get("/api/v2/workspaces", queryParams);

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to fetch workspaces",
    });
  }
};

/**
 * Get a specific workspace by ID
 * GET /api/ardoq/workspaces/:id
 */
export const getWorkspace = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const configId = req.query.configId as string | undefined;
    const client = await getArdoqClient(configId);
    const data = await client.get(`/api/v2/workspaces/${id}`);

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to fetch workspace",
    });
  }
};

/**
 * Get workspace context
 * GET /api/ardoq/workspaces/:id/context
 * Returns metadata about the workspace including component types, reference types, etc.
 */
export const getWorkspaceContext = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const configId = req.query.configId as string | undefined;
    const client = await getArdoqClient(configId);
    const data = await client.get(`/api/v2/workspaces/${id}/context`);

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to fetch workspace context",
    });
  }
};
