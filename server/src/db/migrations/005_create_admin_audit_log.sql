-- A-09: Admin Audit Log Table
-- Tracks all administrative actions for compliance and security auditing

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id SERIAL PRIMARY KEY,
  admin_id VARCHAR(64) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  resource_name VARCHAR(255),
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success', -- 'success' or 'failed'
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for common queries
  CONSTRAINT action_type_valid CHECK (action_type IN (
    'ban_user', 'unban_user', 'delete_post', 'delete_comment',
    'remove_media', 'update_tags', 'update_settings', 
    'verify_user', 'unverify_user', 'set_admin', 'revoke_admin',
    'suspend_account', 'restore_account', 'edit_post_content',
    'create_announcement', 'update_announcement', 'delete_announcement'
  ))
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action_type ON admin_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_resource ON admin_audit_log(resource_type, resource_id);

-- Audit log retention policy (keep 2 years of logs)
-- Optional: enable pg_cron for automatic cleanup
-- SELECT cron.schedule('cleanup-audit-logs', '0 1 * * 0', 
--   'DELETE FROM admin_audit_log WHERE created_at < NOW() - INTERVAL ''2 years'''
-- );

COMMENT ON TABLE admin_audit_log IS 'Comprehensive audit trail of all administrative actions for compliance and security monitoring';
COMMENT ON COLUMN admin_audit_log.admin_id IS 'ID of admin who performed the action';
COMMENT ON COLUMN admin_audit_log.action_type IS 'Type of administrative action performed';
COMMENT ON COLUMN admin_audit_log.resource_type IS 'Type of resource affected (user, post, comment, etc)';
COMMENT ON COLUMN admin_audit_log.resource_id IS 'ID of the affected resource';
COMMENT ON COLUMN admin_audit_log.old_value IS 'Previous state of resource before modification (for updates)';
COMMENT ON COLUMN admin_audit_log.new_value IS 'New state of resource after modification (for updates)';
COMMENT ON COLUMN admin_audit_log.ip_address IS 'IP address of admin who performed the action';
COMMENT ON COLUMN admin_audit_log.user_agent IS 'Browser/client info of admin who performed the action';
COMMENT ON COLUMN admin_audit_log.metadata IS 'Additional context about the action (timestamps, affected count, etc)';
