import express, { Request, Response } from "express";
import * as ardoqTestConnections from "../controllers/ardoq/ardoqTestConnections";
import * as ardoqWorkspaces from "../controllers/ardoq/ardoqWorkspaces";
import * as ardoqComponents from "../controllers/ardoq/ardoqComponents";
import * as ardoqConfigurations from "../controllers/ardoq/ardoqConfigurations";
import * as ardoqHierarchy from "../controllers/ardoq/ardoqHierarchy";

const router = express.Router();

// Example route
router.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "API endpoint",
    endpoints: {
      health: "/api/health",
      example: "/api/example",
      ardoq: {
        configurations: {
          create: "POST /api/ardoq/configurations",
          test: "GET /api/ardoq/test-connection?configId=xxx",
          list: "GET /api/ardoq/configurations",
          get: "GET /api/ardoq/configurations/:id",
          active: "GET /api/ardoq/configurations/active",
          update: "PUT /api/ardoq/configurations/:id",
          delete: "DELETE /api/ardoq/configurations/:id",
          activate: "POST /api/ardoq/configurations/:id/activate",
        },
        workspaces: {
          list: "/api/ardoq/workspaces",
          get: "/api/ardoq/workspaces/:id",
          context: "/api/ardoq/workspaces/:id/context",
        },
        components: {
          list: "/api/ardoq/workspaces/:workspaceId/components",
        },
        hierarchy: {
          domains: "/api/ardoq/workspaces/:workspaceId/domains",
          initiatives:
            "/api/ardoq/workspaces/:workspaceId/domains/:domainId/initiatives",
          initiativeHierarchy:
            "/api/ardoq/workspaces/:workspaceId/initiatives/:initiativeId/hierarchy",
        },
      },
    },
  });
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "api",
  });
});

router.get("/example", (req: Request, res: Response) => {
  res.json({
    message: "This is an example API endpoint",
    data: {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
    },
  });
});

// Ardoq API routes
// Configuration creation and testing routes
router.post("/ardoq/configurations", ardoqTestConnections.createConfiguration);
router.get(
  "/ardoq/test-connection",
  ardoqTestConnections.testConnectionWithConfig
);

// Configuration management routes
router.get("/ardoq/configurations", ardoqConfigurations.listConfigurations);
router.get(
  "/ardoq/configurations/active",
  ardoqConfigurations.getActiveConfiguration
);
router.get("/ardoq/configurations/:id", ardoqConfigurations.getConfiguration);
router.put(
  "/ardoq/configurations/:id",
  ardoqConfigurations.updateConfiguration
);
router.delete(
  "/ardoq/configurations/:id",
  ardoqConfigurations.deleteConfiguration
);
router.post(
  "/ardoq/configurations/:id/activate",
  ardoqConfigurations.activateConfiguration
);

// Workspaces
router.get("/ardoq/workspaces", ardoqWorkspaces.listWorkspaces);
router.get("/ardoq/workspaces/:id", ardoqWorkspaces.getWorkspace);
router.get(
  "/ardoq/workspaces/:id/context",
  ardoqWorkspaces.getWorkspaceContext
);

// Components
router.get(
  "/ardoq/workspaces/:workspaceId/components",
  ardoqComponents.listComponents
);

// Hierarchy
router.get("/ardoq/workspaces/:workspaceId/domains", ardoqHierarchy.getDomains);
router.get(
  "/ardoq/workspaces/:workspaceId/domains/:domainId/initiatives",
  ardoqHierarchy.getInitiativesForDomain
);
router.get(
  "/ardoq/workspaces/:workspaceId/initiatives/:initiativeId/hierarchy",
  ardoqHierarchy.getInitiativeHierarchy
);

export default router;
