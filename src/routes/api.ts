import express, { Request, Response } from "express";
import * as ardoqTestConnections from "../controllers/ardoq/ardoqTestConnections";
import * as ardoqWorkspaces from "../controllers/ardoq/ardoqWorkspaces";
import * as ardoqComponents from "../controllers/ardoq/ardoqComponents";
import * as ardoqConfigurations from "../controllers/ardoq/ardoqConfigurations";
import * as ardoqHierarchy from "../controllers/ardoq/ardoqHierarchy";
import * as ardoqFieldMappingDiagnostics from "../controllers/ardoq/ardoqFieldMappingDiagnostics";
import * as azureDevOpsTestConnections from "../controllers/azureDevOps/azureDevOpsTestConnections";
import * as azureDevOpsConfigurations from "../controllers/azureDevOps/azureDevOpsConfigurations";
import * as azureDevOpsProjects from "../controllers/azureDevOps/azureDevOpsProjects";
import * as azureDevOpsWorkItems from "../controllers/azureDevOps/azureDevOpsWorkItems";
import * as syncHistory from "../controllers/syncHistory/syncHistory";
import * as syncHistoryDiagnostics from "../controllers/syncHistory/syncHistoryDiagnostics";
import * as auditLogs from "../controllers/auditLogs/auditLogs";
import * as fieldMapping from "../controllers/fieldMapping/fieldMapping";

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
          fieldMappingDiagnostics: "/api/ardoq/workspaces/:workspaceId/field-mapping-diagnostics?configId=xxx&componentType=Feature&limit=5",
        },
        hierarchy: {
          domains: "/api/ardoq/workspaces/:workspaceId/domains",
          initiatives:
            "/api/ardoq/workspaces/:workspaceId/domains/:domainId/initiatives",
          initiativeHierarchy:
            "/api/ardoq/workspaces/:workspaceId/initiatives/:initiativeId/hierarchy",
        },
      },
      azureDevOps: {
        configurations: {
          create: "POST /api/azure-devops/configurations",
          test: "GET /api/azure-devops/test-connection?configId=xxx",
          list: "GET /api/azure-devops/configurations",
          get: "GET /api/azure-devops/configurations/:id",
          active: "GET /api/azure-devops/configurations/active",
          update: "PUT /api/azure-devops/configurations/:id",
          delete: "DELETE /api/azure-devops/configurations/:id",
          activate: "POST /api/azure-devops/configurations/:id/activate",
        },
        projects: {
          list: "GET /api/azure-devops/projects?configId=xxx",
          create: "POST /api/azure-devops/projects?configId=xxx",
        },
        processes: {
          list: "GET /api/azure-devops/processes?configId=xxx",
        },
        workItems: {
          check:
            "GET /api/azure-devops/projects/:project/workitems/check?configId=xxx",
          create:
            "POST /api/azure-devops/projects/:project/workitems?configId=xxx&overwrite=true",
        },
      },
      fieldMapping: {
        templates:
          "GET /api/field-mapping/templates?processTemplateName={processTemplateName}",
        configs: {
          list: "GET /api/field-mapping/configs?projectId={projectId}",
          get: "GET /api/field-mapping/configs/:id",
          create: "POST /api/field-mapping/configs",
          update: "PUT /api/field-mapping/configs/:id",
          delete: "DELETE /api/field-mapping/configs/:id",
        },
        workItemTypes:
          "GET /api/field-mapping/work-item-types?projectId={projectId}&configId={configId}",
        fields:
          "GET /api/field-mapping/fields?projectId={projectId}&workItemType={workItemType}&configId={configId}",
      },
      syncHistory: {
        list: "GET /api/sync-history",
        get: "GET /api/sync-history/:id",
        items: "GET /api/sync-history/:id/items",
        stats: "GET /api/sync-history/stats",
        diagnostics: "GET /api/sync-history/diagnostics",
      },
      auditLogs: {
        list: "GET /api/audit-logs",
        stats: "GET /api/audit-logs/stats",
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

// Field Mapping Diagnostics
router.get(
  "/ardoq/workspaces/:workspaceId/field-mapping-diagnostics",
  ardoqFieldMappingDiagnostics.diagnoseFieldMapping
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

// Azure DevOps API routes
// Configuration creation and testing routes
router.post(
  "/azure-devops/configurations",
  azureDevOpsTestConnections.createConfiguration
);
router.get(
  "/azure-devops/test-connection",
  azureDevOpsTestConnections.testConnectionWithConfig
);

// Configuration management routes
router.get(
  "/azure-devops/configurations",
  azureDevOpsConfigurations.listConfigurations
);
router.get(
  "/azure-devops/configurations/active",
  azureDevOpsConfigurations.getActiveConfiguration
);
router.get(
  "/azure-devops/configurations/:id",
  azureDevOpsConfigurations.getConfiguration
);
router.put(
  "/azure-devops/configurations/:id",
  azureDevOpsConfigurations.updateConfiguration
);
router.delete(
  "/azure-devops/configurations/:id",
  azureDevOpsConfigurations.deleteConfiguration
);
router.post(
  "/azure-devops/configurations/:id/activate",
  azureDevOpsConfigurations.activateConfiguration
);

// Projects
router.get("/azure-devops/projects", azureDevOpsProjects.listProjects);
router.post("/azure-devops/projects", azureDevOpsProjects.createProject);

// Process Templates
router.get("/azure-devops/processes", azureDevOpsProjects.getProcessTemplates);

// Work Items
router.get(
  "/azure-devops/projects/:project/workitems/check",
  azureDevOpsWorkItems.checkWorkItems
);
router.post(
  "/azure-devops/projects/:project/workitems",
  azureDevOpsWorkItems.createWorkItems
);

// Sync History routes
router.get("/sync-history", syncHistory.listSyncHistory);
router.get("/sync-history/stats", syncHistory.getSyncHistoryStats);
router.get("/sync-history/diagnostics", syncHistoryDiagnostics.getSyncHistoryDiagnostics);
router.get("/sync-history/:id", syncHistory.getSyncHistoryById);
router.get("/sync-history/:id/items", syncHistory.getSyncHistoryItems);

// Audit Logs routes
router.get("/audit-logs", auditLogs.listAuditLogs);
router.get("/audit-logs/stats", auditLogs.getAuditLogStats);

// Field Mapping routes
router.get("/field-mapping/templates", fieldMapping.getTemplates);
router.get("/field-mapping/configs", fieldMapping.getFieldMappingConfigs);
router.get("/field-mapping/configs/:id", fieldMapping.getFieldMappingConfig);
router.post("/field-mapping/configs", fieldMapping.createFieldMappingConfig);
router.put("/field-mapping/configs/:id", fieldMapping.updateFieldMappingConfig);
router.delete(
  "/field-mapping/configs/:id",
  fieldMapping.deleteFieldMappingConfig
);
router.get("/field-mapping/work-item-types", fieldMapping.getWorkItemTypes);
router.get("/field-mapping/fields", fieldMapping.getFieldsForWorkItemType);

export default router;
