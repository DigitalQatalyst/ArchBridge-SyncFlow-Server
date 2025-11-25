import { Request, Response } from "express";
import { supabase } from "../../db/supabase";
import { syncHistoryStorage } from "../../services/syncHistoryStorage";
import { auditLogStorage } from "../../services/auditLogStorage";

/**
 * Diagnostic endpoint to check sync history and audit logs database setup
 * GET /api/sync-history/diagnostics
 */
export const getSyncHistoryDiagnostics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        tables: {
          sync_history: { exists: false, accessible: false, error: null },
          sync_history_items: { exists: false, accessible: false, error: null },
          audit_logs: { exists: false, accessible: false, error: null },
        },
      },
      services: {
        syncHistoryStorage: { working: false, error: null },
        auditLogStorage: { working: false, error: null },
      },
    };

    // Test sync_history table
    try {
      const { data, error } = await supabase
        .from("sync_history")
        .select("id")
        .limit(1);

      if (error) {
        diagnostics.database.tables.sync_history.error = error.message;
        diagnostics.database.tables.sync_history.exists = false;
      } else {
        diagnostics.database.tables.sync_history.exists = true;
        diagnostics.database.tables.sync_history.accessible = true;
        diagnostics.database.connected = true;
      }
    } catch (error: any) {
      diagnostics.database.tables.sync_history.error = error?.message || String(error);
    }

    // Test sync_history_items table
    try {
      const { data, error } = await supabase
        .from("sync_history_items")
        .select("id")
        .limit(1);

      if (error) {
        diagnostics.database.tables.sync_history_items.error = error.message;
        diagnostics.database.tables.sync_history_items.exists = false;
      } else {
        diagnostics.database.tables.sync_history_items.exists = true;
        diagnostics.database.tables.sync_history_items.accessible = true;
      }
    } catch (error: any) {
      diagnostics.database.tables.sync_history_items.error = error?.message || String(error);
    }

    // Test audit_logs table
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id")
        .limit(1);

      if (error) {
        diagnostics.database.tables.audit_logs.error = error.message;
        diagnostics.database.tables.audit_logs.exists = false;
      } else {
        diagnostics.database.tables.audit_logs.exists = true;
        diagnostics.database.tables.audit_logs.accessible = true;
      }
    } catch (error: any) {
      diagnostics.database.tables.audit_logs.error = error?.message || String(error);
    }

    // Test syncHistoryStorage service
    try {
      const { data, total } = await syncHistoryStorage.listSyncHistory({
        limit: 1,
        offset: 0,
      });
      diagnostics.services.syncHistoryStorage.working = true;
    } catch (error: any) {
      diagnostics.services.syncHistoryStorage.error = error?.message || String(error);
    }

    // Test auditLogStorage service
    try {
      const { data, total } = await auditLogStorage.listAuditLogs({
        limit: 1,
        offset: 0,
      });
      diagnostics.services.auditLogStorage.working = true;
    } catch (error: any) {
      diagnostics.services.auditLogStorage.error = error?.message || String(error);
    }

    // Get counts
    try {
      const { count: syncHistoryCount } = await supabase
        .from("sync_history")
        .select("*", { count: "exact", head: true });
      diagnostics.database.tables.sync_history.count = syncHistoryCount || 0;
    } catch (error: any) {
      // Ignore count errors
    }

    try {
      const { count: auditLogsCount } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true });
      diagnostics.database.tables.audit_logs.count = auditLogsCount || 0;
    } catch (error: any) {
      // Ignore count errors
    }

    const allTablesExist =
      diagnostics.database.tables.sync_history.exists &&
      diagnostics.database.tables.sync_history_items.exists &&
      diagnostics.database.tables.audit_logs.exists;

    const allServicesWorking =
      diagnostics.services.syncHistoryStorage.working &&
      diagnostics.services.auditLogStorage.working;

    res.json({
      success: allTablesExist && allServicesWorking,
      data: diagnostics,
      message: allTablesExist && allServicesWorking
        ? "All systems operational"
        : "Some issues detected. Check the diagnostics details.",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || "Failed to run diagnostics",
      details: error?.stack,
    });
  }
};

