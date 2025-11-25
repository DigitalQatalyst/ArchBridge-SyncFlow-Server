-- Add changed_by_user column to sync_history_items table
-- This column stores the System.ChangedBy information from Azure DevOps work items
-- as JSONB to preserve the full IdentityRef structure

ALTER TABLE sync_history_items 
ADD COLUMN IF NOT EXISTS changed_by_user JSONB;

-- Add index for querying by user information
CREATE INDEX IF NOT EXISTS idx_sync_history_items_changed_by_user 
ON sync_history_items USING GIN (changed_by_user);

-- Add comment to document the column
COMMENT ON COLUMN sync_history_items.changed_by_user IS 
'Stores the System.ChangedBy IdentityRef from Azure DevOps work item, including displayName, uniqueName, id, url, imageUrl, and descriptor';

