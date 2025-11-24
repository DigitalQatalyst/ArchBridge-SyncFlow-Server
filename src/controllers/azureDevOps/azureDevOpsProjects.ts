import { Request, Response } from "express";
import { getAzureDevOpsClient } from "../../services/azureDevOpsClientHelper";

/**
 * Get all available process templates for the organization
 * GET /api/azure-devops/processes?configId=xxx
 * Query params: configId (optional) - If provided, uses that configuration. If omitted, uses active configuration.
 */
export const getProcessTemplates = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const configId = req.query.configId as string | undefined;

    // Get configured client
    const client = await getAzureDevOpsClient(configId);

    // Fetch all process templates
    const processes = await client.getProcesses();

    // Format the response to include only relevant information
    const templates = processes.map((process) => ({
      typeId: process.typeId,
      name: process.name,
      description: process.description || "",
      isDefault: process.isDefault || false,
      isEnabled: process.isEnabled !== false, // Default to true if not specified
    }));

    res.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to fetch process templates",
      details: error.statusCode
        ? `HTTP ${error.statusCode}: ${error.message || "Failed to fetch process templates"}`
        : "Failed to fetch process templates",
    });
  }
};

/**
 * List all projects in the organization
 * GET /api/azure-devops/projects?configId=xxx
 * Query params: configId (optional) - If provided, uses that configuration. If omitted, uses active configuration.
 */
export const listProjects = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const configId = req.query.configId as string | undefined;

    // Get configured client
    const client = await getAzureDevOpsClient(configId);

    // Fetch all projects
    const projectsResponse = await client.listProjects();

    // Extract projects array from response (API returns { value: [...], count: N })
    const projects = projectsResponse.value || projectsResponse || [];
    const count = projectsResponse.count || projects.length;

    res.json({
      success: true,
      data: projects,
      count: count,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to list projects",
      details: error.statusCode
        ? `HTTP ${error.statusCode}: ${error.message || "Failed to list projects"}`
        : "Failed to list projects",
    });
  }
};

interface CreateProjectRequest {
  name: string;
  description?: string;
  visibility?: "private" | "public";
  capabilities?: {
    processTemplate?: {
      templateTypeId: string;
    };
    versioncontrol?: {
      sourceControlType: string;
    };
  };
}

/**
 * Create a new Azure DevOps project
 * POST /api/azure-devops/projects?configId=xxx
 * Query params: configId (optional) - If provided, uses that configuration. If omitted, uses active configuration.
 */
export const createProject = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const configId = req.query.configId as string | undefined;
    const {
      name,
      description,
      visibility,
      capabilities,
    }: CreateProjectRequest = req.body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "name is required and must be a non-empty string",
      });
      return;
    }

    if (visibility && visibility !== "private" && visibility !== "public") {
      res.status(400).json({
        success: false,
        error: "visibility must be either 'private' or 'public'",
      });
      return;
    }

    // Get configured client
    const client = await getAzureDevOpsClient(configId);

    // Prepare project creation payload
    const projectPayload: any = {
      name: name.trim(),
    };

    if (description !== undefined) {
      projectPayload.description = description;
    }

    if (visibility !== undefined) {
      projectPayload.visibility = visibility;
    }

    // Set default capabilities if not provided (defaults to Agile process template)
    if (capabilities === undefined) {
      // Fetch Agile process template ID dynamically
      const agileTemplateId = await client.getAgileProcessTemplateId();
      if (!agileTemplateId) {
        res.status(500).json({
          success: false,
          error:
            "Failed to retrieve Agile process template. Please ensure your organization has the Agile process template available, or specify a process template in the request.",
        });
        return;
      }

      projectPayload.capabilities = {
        processTemplate: {
          templateTypeId: agileTemplateId,
        },
        versioncontrol: {
          sourceControlType: "Git",
        },
      };
    } else {
      // If capabilities provided but no processTemplate, default to Agile
      if (!capabilities.processTemplate) {
        const agileTemplateId = await client.getAgileProcessTemplateId();
        if (!agileTemplateId) {
          res.status(500).json({
            success: false,
            error:
              "Failed to retrieve Agile process template. Please ensure your organization has the Agile process template available, or specify a process template in the request.",
          });
          return;
        }
        capabilities.processTemplate = {
          templateTypeId: agileTemplateId,
        };
      }
      // If capabilities provided but no versioncontrol, default to Git
      capabilities.versioncontrol ??= {
        sourceControlType: "Git",
      };
      projectPayload.capabilities = capabilities;
    }

    // Create project
    const operationReference = await client.post(
      "/_apis/projects?api-version=7.1",
      projectPayload
    );

    res.status(202).json({
      success: true,
      message: "Project creation queued successfully",
      data: operationReference,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to create project",
      details: error.statusCode
        ? `HTTP ${error.statusCode}: ${
            error.message || "Project creation failed"
          }`
        : "Project creation error",
    });
  }
};
