-- Sync History and Audit Logs Migration
-- Run this SQL file in your Supabase SQL Editor

-- Create ENUM types
CREATE TYPE sync_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');
CREATE TYPE item_type AS ENUM ('epic', 'feature', 'user_story');
CREATE TYPE item_status AS ENUM ('created', 'failed', 'skipped');
CREATE TYPE action_type AS ENUM (
    'sync_started',
    'sync_completed',
    'sync_failed',
    'sync_cancelled',
    'config_created',
    'config_updated',
    'config_deleted',
    'config_activated',
    'connection_tested'
);

-- Create sync_history table
CREATE TABLE IF NOT EXISTS sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL,
    source_config_id VARCHAR(255),
    target_type VARCHAR(50) NOT NULL,
    target_config_id VARCHAR(255),
    project_name VARCHAR(255) NOT NULL,
    status sync_status NOT NULL DEFAULT 'pending',
    overwrite_mode BOOLEAN NOT NULL DEFAULT false,
    total_items INTEGER NOT NULL DEFAULT 0,
    items_created INTEGER NOT NULL DEFAULT 0,
    items_failed INTEGER NOT NULL DEFAULT 0,
    epics_created INTEGER NOT NULL DEFAULT 0,
    epics_failed INTEGER NOT NULL DEFAULT 0,
    features_created INTEGER NOT NULL DEFAULT 0,
    features_failed INTEGER NOT NULL DEFAULT 0,
    user_stories_created INTEGER NOT NULL DEFAULT 0,
    user_stories_failed INTEGER NOT NULL DEFAULT 0,
    deletion_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    error_message TEXT,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create sync_history_items table
CREATE TABLE IF NOT EXISTS sync_history_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_history_id UUID NOT NULL REFERENCES sync_history(id) ON DELETE CASCADE,
    ardoq_id VARCHAR(255) NOT NULL,
    item_name VARCHAR(500) NOT NULL,
    item_type item_type NOT NULL,
    status item_status NOT NULL,
    azure_devops_id INTEGER,
    azure_devops_url TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type action_type NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    user_id UUID,
    source_ip VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for sync_history
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON sync_history(status);
CREATE INDEX IF NOT EXISTS idx_sync_history_created_at ON sync_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_source_config ON sync_history(source_config_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_target_config ON sync_history(target_config_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_project_name ON sync_history(project_name);

-- Create indexes for sync_history_items
CREATE INDEX IF NOT EXISTS idx_sync_history_items_sync_id ON sync_history_items(sync_history_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_items_status ON sync_history_items(status);
CREATE INDEX IF NOT EXISTS idx_sync_history_items_type ON sync_history_items(item_type);
CREATE INDEX IF NOT EXISTS idx_sync_history_items_ardoq_id ON sync_history_items(ardoq_id);

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for sync_history updated_at
CREATE TRIGGER update_sync_history_updated_at BEFORE UPDATE ON sync_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

