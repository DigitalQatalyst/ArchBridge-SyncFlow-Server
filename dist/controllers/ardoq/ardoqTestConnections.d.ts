import { Request, Response } from "express";
/**
 * Create a new Ardoq configuration
 * Automatically tests the connection during creation
 * Configuration can be saved even if test fails, but cannot be used until test passes
 * POST /api/ardoq/configurations
 */
export declare const createConfiguration: (req: Request, res: Response) => Promise<void>;
/**
 * Test connection using existing saved configuration and update test status
 * GET /api/ardoq/test-connection?configId=xxx
 * Query params: configId (optional) - If provided, uses that configuration. If omitted, uses active configuration.
 */
export declare const testConnectionWithConfig: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=ardoqTestConnections.d.ts.map