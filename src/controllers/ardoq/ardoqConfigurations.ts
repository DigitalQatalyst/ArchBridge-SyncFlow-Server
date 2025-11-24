import { Request, Response } from "express";
import { configStorage } from "../../services/configStorage";

/**
 * Get all saved configurations
 * GET /api/ardoq/configurations
 */
export const listConfigurations = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const configs = await configStorage.getAllConfigurations();
    
    // Don't expose the actual API token in the list
    const safeConfigs = configs.map(config => ({
      id: config.id,
      name: config.name,
      apiHost: config.apiHost,
      orgLabel: config.orgLabel,
      isActive: config.isActive,
      isTested: config.isTested,
      testPassed: config.testPassed,
      testError: config.testError,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }));

    res.json({
      success: true,
      data: safeConfigs,
      count: safeConfigs.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve configurations",
    });
  }
};

/**
 * Get a specific configuration by ID
 * GET /api/ardoq/configurations/:id
 */
export const getConfiguration = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const config = await configStorage.getConfigurationById(id);

    if (!config) {
      res.status(404).json({
        success: false,
        error: `Configuration with id ${id} not found`,
      });
      return;
    }

    // Don't expose the actual API token
    const safeConfig = {
      id: config.id,
      name: config.name,
      apiHost: config.apiHost,
      orgLabel: config.orgLabel,
      isActive: config.isActive,
      isTested: config.isTested,
      testPassed: config.testPassed,
      testError: config.testError,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };

    res.json({
      success: true,
      data: safeConfig,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve configuration",
    });
  }
};

/**
 * Get the active configuration
 * GET /api/ardoq/configurations/active
 */
export const getActiveConfiguration = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const config = await configStorage.getActiveConfiguration();

    if (!config) {
      res.status(404).json({
        success: false,
        error: "No active configuration found",
      });
      return;
    }

    // Don't expose the actual API token
    const safeConfig = {
      id: config.id,
      name: config.name,
      apiHost: config.apiHost,
      orgLabel: config.orgLabel,
      isActive: config.isActive,
      isTested: config.isTested,
      testPassed: config.testPassed,
      testError: config.testError,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };

    res.json({
      success: true,
      data: safeConfig,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve active configuration",
    });
  }
};

/**
 * Update a configuration
 * PUT /api/ardoq/configurations/:id
 */
export const updateConfiguration = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, apiHost, orgLabel, isActive, apiToken } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (apiHost !== undefined) updates.apiHost = apiHost;
    if (orgLabel !== undefined) updates.orgLabel = orgLabel;
    if (isActive !== undefined) updates.isActive = isActive;
    if (apiToken !== undefined) {
      updates.apiToken = apiToken;
      // If API token is updated, reset test status
      updates.isTested = false;
      updates.testPassed = false;
      updates.testError = null;
    }

    const updated = await configStorage.updateConfiguration(id, updates);

    if (!updated) {
      res.status(404).json({
        success: false,
        error: `Configuration with id ${id} not found`,
      });
      return;
    }

    // Don't expose the actual API token
    const safeConfig = {
      id: updated.id,
      name: updated.name,
      apiHost: updated.apiHost,
      orgLabel: updated.orgLabel,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    res.json({
      success: true,
      message: "Configuration updated successfully",
      data: safeConfig,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update configuration",
    });
  }
};

/**
 * Delete a configuration
 * DELETE /api/ardoq/configurations/:id
 */
export const deleteConfiguration = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await configStorage.deleteConfiguration(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: `Configuration with id ${id} not found`,
      });
      return;
    }

    res.json({
      success: true,
      message: "Configuration deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to delete configuration",
    });
  }
};

/**
 * Set a configuration as active
 * POST /api/ardoq/configurations/:id/activate
 */
export const activateConfiguration = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const config = await configStorage.setActiveConfiguration(id);

    if (!config) {
      res.status(404).json({
        success: false,
        error: `Configuration with id ${id} not found`,
      });
      return;
    }

    // Don't expose the actual API token
    const safeConfig = {
      id: config.id,
      name: config.name,
      apiHost: config.apiHost,
      orgLabel: config.orgLabel,
      isActive: config.isActive,
      isTested: config.isTested,
      testPassed: config.testPassed,
      testError: config.testError,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };

    res.json({
      success: true,
      message: "Configuration activated successfully",
      data: safeConfig,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to activate configuration",
    });
  }
};


