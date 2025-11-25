import { Request, Response } from "express";
import {
  syncHistoryStorage,
  SyncStatus,
  ItemStatus,
  ItemType,
} from "../../services/syncHistoryStorage";

/**
 * List sync history records
 * GET /api/sync-history
 */
export const listSyncHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const status = req.query.status as SyncStatus | undefined;
    const source_type = req.query.source_type as string | undefined;
    const target_type = req.query.target_type as string | undefined;
    const start_date = req.query.start_date as string | undefined;
    const end_date = req.query.end_date as string | undefined;
    const project_name = req.query.project_name as string | undefined;

    const { data, total } = await syncHistoryStorage.listSyncHistory({
      limit,
      offset,
      status,
      source_type,
      target_type,
      start_date,
      end_date,
      project_name,
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
      error: error.message || "Failed to list sync history",
    });
  }
};

/**
 * Get sync history by ID
 * GET /api/sync-history/:id
 */
export const getSyncHistoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const syncHistory = await syncHistoryStorage.getSyncHistoryById(id);

    if (!syncHistory) {
      res.status(404).json({
        success: false,
        error: "Sync history not found",
      });
      return;
    }

    res.json({
      success: true,
      data: syncHistory,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get sync history",
    });
  }
};

/**
 * Get sync history items
 * GET /api/sync-history/:id/items
 */
export const getSyncHistoryItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const status = req.query.status as ItemStatus | undefined;
    const item_type = req.query.item_type as ItemType | undefined;

    const { data, total } = await syncHistoryStorage.listSyncHistoryItems({
      sync_history_id: id,
      limit,
      offset,
      status,
      item_type,
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
      error: error.message || "Failed to get sync history items",
    });
  }
};

/**
 * Get sync history statistics
 * GET /api/sync-history/stats
 */
export const getSyncHistoryStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const start_date = req.query.start_date as string | undefined;
    const end_date = req.query.end_date as string | undefined;

    const stats = await syncHistoryStorage.getSyncStatistics({
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
      error: error.message || "Failed to get sync history statistics",
    });
  }
};

