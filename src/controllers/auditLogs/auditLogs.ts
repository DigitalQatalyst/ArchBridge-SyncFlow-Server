import { Request, Response } from "express";
import { auditLogStorage, ActionType } from "../../services/auditLogStorage";

/**
 * List audit logs
 * GET /api/audit-logs
 */
export const listAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const action_type = req.query.action_type as ActionType | undefined;
    const entity_type = req.query.entity_type as string | undefined;
    const start_date = req.query.start_date as string | undefined;
    const end_date = req.query.end_date as string | undefined;
    const entity_id = req.query.entity_id as string | undefined;

    const { data, total } = await auditLogStorage.listAuditLogs({
      limit,
      offset,
      action_type,
      entity_type,
      start_date,
      end_date,
      entity_id,
    });

    res.json({
      success: true,
      data,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to list audit logs",
    });
  }
};

/**
 * Get audit log statistics
 * GET /api/audit-logs/stats
 */
export const getAuditLogStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const start_date = req.query.start_date as string | undefined;
    const end_date = req.query.end_date as string | undefined;

    const stats = await auditLogStorage.getAuditLogStatistics({
      start_date,
      end_date,
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get audit log statistics",
    });
  }
};

