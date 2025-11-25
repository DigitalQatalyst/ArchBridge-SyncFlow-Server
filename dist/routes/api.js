"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ardoqTestConnections = __importStar(require("../controllers/ardoq/ardoqTestConnections"));
const ardoqWorkspaces = __importStar(require("../controllers/ardoq/ardoqWorkspaces"));
const ardoqComponents = __importStar(require("../controllers/ardoq/ardoqComponents"));
const ardoqConfigurations = __importStar(require("../controllers/ardoq/ardoqConfigurations"));
const ardoqHierarchy = __importStar(require("../controllers/ardoq/ardoqHierarchy"));
const azureDevOpsTestConnections = __importStar(require("../controllers/azureDevOps/azureDevOpsTestConnections"));
const azureDevOpsConfigurations = __importStar(require("../controllers/azureDevOps/azureDevOpsConfigurations"));
const azureDevOpsProjects = __importStar(require("../controllers/azureDevOps/azureDevOpsProjects"));
const azureDevOpsWorkItems = __importStar(require("../controllers/azureDevOps/azureDevOpsWorkItems"));
const router = express_1.default.Router();
// Example route
router.get("/", (_req, res) => {
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
                    initiatives: "/api/ardoq/workspaces/:workspaceId/domains/:domainId/initiatives",
                    initiativeHierarchy: "/api/ardoq/workspaces/:workspaceId/initiatives/:initiativeId/hierarchy",
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
                    check: "GET /api/azure-devops/projects/:project/workitems/check?configId=xxx",
                    create: "POST /api/azure-devops/projects/:project/workitems?configId=xxx&overwrite=true",
                },
            },
        },
    });
});
router.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "api",
    });
});
router.get("/example", (req, res) => {
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
router.get("/ardoq/test-connection", ardoqTestConnections.testConnectionWithConfig);
// Configuration management routes
router.get("/ardoq/configurations", ardoqConfigurations.listConfigurations);
router.get("/ardoq/configurations/active", ardoqConfigurations.getActiveConfiguration);
router.get("/ardoq/configurations/:id", ardoqConfigurations.getConfiguration);
router.put("/ardoq/configurations/:id", ardoqConfigurations.updateConfiguration);
router.delete("/ardoq/configurations/:id", ardoqConfigurations.deleteConfiguration);
router.post("/ardoq/configurations/:id/activate", ardoqConfigurations.activateConfiguration);
// Workspaces
router.get("/ardoq/workspaces", ardoqWorkspaces.listWorkspaces);
router.get("/ardoq/workspaces/:id", ardoqWorkspaces.getWorkspace);
router.get("/ardoq/workspaces/:id/context", ardoqWorkspaces.getWorkspaceContext);
// Components
router.get("/ardoq/workspaces/:workspaceId/components", ardoqComponents.listComponents);
// Hierarchy
router.get("/ardoq/workspaces/:workspaceId/domains", ardoqHierarchy.getDomains);
router.get("/ardoq/workspaces/:workspaceId/domains/:domainId/initiatives", ardoqHierarchy.getInitiativesForDomain);
router.get("/ardoq/workspaces/:workspaceId/initiatives/:initiativeId/hierarchy", ardoqHierarchy.getInitiativeHierarchy);
// Azure DevOps API routes
// Configuration creation and testing routes
router.post("/azure-devops/configurations", azureDevOpsTestConnections.createConfiguration);
router.get("/azure-devops/test-connection", azureDevOpsTestConnections.testConnectionWithConfig);
// Configuration management routes
router.get("/azure-devops/configurations", azureDevOpsConfigurations.listConfigurations);
router.get("/azure-devops/configurations/active", azureDevOpsConfigurations.getActiveConfiguration);
router.get("/azure-devops/configurations/:id", azureDevOpsConfigurations.getConfiguration);
router.put("/azure-devops/configurations/:id", azureDevOpsConfigurations.updateConfiguration);
router.delete("/azure-devops/configurations/:id", azureDevOpsConfigurations.deleteConfiguration);
router.post("/azure-devops/configurations/:id/activate", azureDevOpsConfigurations.activateConfiguration);
// Projects
router.get("/azure-devops/projects", azureDevOpsProjects.listProjects);
router.post("/azure-devops/projects", azureDevOpsProjects.createProject);
// Process Templates
router.get("/azure-devops/processes", azureDevOpsProjects.getProcessTemplates);
// Work Items
router.get("/azure-devops/projects/:project/workitems/check", azureDevOpsWorkItems.checkWorkItems);
router.post("/azure-devops/projects/:project/workitems", azureDevOpsWorkItems.createWorkItems);
exports.default = router;
//# sourceMappingURL=api.js.map