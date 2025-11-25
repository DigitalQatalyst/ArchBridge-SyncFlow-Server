# Troubleshooting Sync History and Audit Logs

If you're unable to fetch audit logs and sync history when running a sync, follow these troubleshooting steps.

## Quick Diagnostic

First, check if the database tables exist and are accessible:

```bash
GET /api/sync-history/diagnostics
```

This endpoint will return:
- Database connection status
- Table existence and accessibility
- Service health status
- Record counts

## Common Issues and Solutions

### 1. Database Tables Don't Exist

**Symptom:** Diagnostic endpoint shows `exists: false` for tables.

**Solution:** Run the database migration:

1. Open your Supabase SQL Editor
2. Copy and paste the contents of `supabase-sync-history-migration.sql`
3. Execute the SQL script
4. Verify tables were created by running the diagnostic endpoint again

### 2. Database Connection Issues

**Symptom:** Diagnostic endpoint shows `connected: false` or connection errors.

**Solution:** Check your environment variables:

1. Verify `.env` file contains:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Ensure the service role key has proper permissions:
   - Should have full access to `sync_history`, `sync_history_items`, and `audit_logs` tables
   - Should be able to INSERT, SELECT, UPDATE records

3. Restart your server after updating environment variables

### 3. Silent Failures During Sync

**Symptom:** Sync completes but no sync history or audit logs are created.

**Solution:** Check server logs for detailed error messages. The improved error logging now includes:
- Full error messages
- Stack traces
- Database error details (hints, codes)
- Context about which operation failed

Look for log entries like:
```
Failed to create sync history: { error: "...", details: "...", ... }
Failed to create audit log for sync_started: { error: "...", ... }
```

### 4. Permission Issues

**Symptom:** Tables exist but operations fail with permission errors.

**Solution:** Check Supabase Row Level Security (RLS) policies:

1. If RLS is enabled, ensure the service role key bypasses RLS
2. Or create policies that allow the service role to access the tables
3. For service role keys, RLS should typically be bypassed

### 5. Type Mismatch Errors

**Symptom:** Errors about enum types or data type mismatches.

**Solution:** Ensure the migration created the correct ENUM types:

```sql
-- Verify these types exist:
SELECT typname FROM pg_type WHERE typname IN (
  'sync_status',
  'item_type',
  'item_status',
  'action_type'
);
```

If they don't exist, re-run the migration script.

## Verification Steps

After fixing issues, verify everything works:

1. **Run diagnostics:**
   ```bash
   curl http://localhost:3000/api/sync-history/diagnostics
   ```

2. **Check for existing records:**
   ```bash
   curl http://localhost:3000/api/sync-history
   curl http://localhost:3000/api/audit-logs
   ```

3. **Run a test sync** and verify:
   - Sync history record is created
   - Audit log entries are created
   - Items are tracked in sync_history_items

## Enhanced Error Logging

The sync endpoint now includes detailed error logging. When issues occur, check your server console for:

- **Error messages** with full context
- **Stack traces** for debugging
- **Database hints** from Supabase
- **Operation context** (which item, sync ID, etc.)

Example error log format:
```json
{
  "error": "relation \"sync_history\" does not exist",
  "stack": "...",
  "details": "...",
  "syncHistoryId": "...",
  "epicId": "..."
}
```

## Getting Help

If issues persist:

1. Run the diagnostic endpoint and save the output
2. Check server logs for detailed error messages
3. Verify database migration was run successfully
4. Check Supabase dashboard for table existence and permissions
5. Ensure environment variables are correctly set

## Migration File Location

The migration SQL file is located at:
- `supabase-sync-history-migration.sql`

Make sure to run this in your Supabase SQL Editor before using sync history features.

