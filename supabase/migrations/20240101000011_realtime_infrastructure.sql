-- Create user_notifications table for system notifications
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  action_label TEXT,
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_presence table for tracking online users
CREATE TABLE user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES uploaded_documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('online', 'away', 'offline')) DEFAULT 'online',
  current_page INTEGER DEFAULT 1,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, document_id)
);

-- Create document_processing_logs table for detailed processing tracking
CREATE TABLE document_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES uploaded_documents(id) ON DELETE CASCADE NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('upload', 'ocr', 'embedding', 'classification', 'analysis')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  message TEXT,
  error_details JSONB,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create real_time_events table for audit trail
CREATE TABLE real_time_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add processing fields to uploaded_documents if they don't exist
ALTER TABLE uploaded_documents 
ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0 CHECK (processing_progress >= 0 AND processing_progress <= 100);

ALTER TABLE uploaded_documents 
ADD COLUMN IF NOT EXISTS processing_stage TEXT CHECK (processing_stage IN ('upload', 'ocr', 'embedding', 'classification', 'analysis'));

ALTER TABLE uploaded_documents 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Create indexes for better performance
CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_read ON user_notifications(user_id, read);
CREATE INDEX idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX idx_user_presence_document_id ON user_presence(document_id);
CREATE INDEX idx_user_presence_status ON user_presence(status);
CREATE INDEX idx_document_processing_logs_document_id ON document_processing_logs(document_id);
CREATE INDEX idx_document_processing_logs_stage ON document_processing_logs(document_id, stage);
CREATE INDEX idx_real_time_events_resource ON real_time_events(resource_type, resource_id);
CREATE INDEX idx_real_time_events_user_id ON real_time_events(user_id);

-- Enable RLS on new tables
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_time_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_notifications
-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications" ON user_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- System can insert notifications for users
CREATE POLICY "System can create notifications" ON user_notifications
  FOR INSERT WITH CHECK (true);

-- RLS Policies for user_presence
-- Users can view presence on documents they have access to
CREATE POLICY "Users can view presence on accessible documents" ON user_presence
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM uploaded_documents ud 
      WHERE ud.id = user_presence.document_id 
      AND ud.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM annotation_collaborators ac
      WHERE ac.document_id = user_presence.document_id
      AND ac.user_id = auth.uid()
      AND ac.status = 'accepted'
    )
  );

-- Users can manage their own presence
CREATE POLICY "Users can manage their own presence" ON user_presence
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for document_processing_logs
-- Users can view processing logs for their documents
CREATE POLICY "Users can view processing logs for their documents" ON document_processing_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM uploaded_documents ud 
      WHERE ud.id = document_processing_logs.document_id 
      AND ud.user_id = auth.uid()
    )
  );

-- System can insert processing logs
CREATE POLICY "System can create processing logs" ON document_processing_logs
  FOR INSERT WITH CHECK (true);

-- RLS Policies for real_time_events
-- Users can view events related to their resources
CREATE POLICY "Users can view their real-time events" ON real_time_events
  FOR SELECT USING (
    auth.uid() = user_id OR
    (resource_type = 'document' AND EXISTS (
      SELECT 1 FROM uploaded_documents ud 
      WHERE ud.id = real_time_events.resource_id 
      AND ud.user_id = auth.uid()
    )) OR
    (resource_type = 'annotation' AND EXISTS (
      SELECT 1 FROM document_annotations da
      JOIN uploaded_documents ud ON ud.id = da.document_id
      WHERE da.id = real_time_events.resource_id 
      AND (ud.user_id = auth.uid() OR da.user_id = auth.uid())
    ))
  );

-- System can insert events
CREATE POLICY "System can create real-time events" ON real_time_events
  FOR INSERT WITH CHECK (true);

-- Create function to update presence timestamp
CREATE OR REPLACE FUNCTION update_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for presence updates
CREATE TRIGGER update_user_presence_timestamp
  BEFORE UPDATE ON user_presence
  FOR EACH ROW EXECUTE FUNCTION update_presence_timestamp();

-- Create function to log real-time events
CREATE OR REPLACE FUNCTION log_real_time_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO real_time_events (
    event_type,
    resource_type,
    resource_id,
    user_id,
    payload
  ) VALUES (
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.user_id, OLD.user_id),
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic event logging
CREATE TRIGGER log_annotation_events
  AFTER INSERT OR UPDATE OR DELETE ON document_annotations
  FOR EACH ROW EXECUTE FUNCTION log_real_time_event();

CREATE TRIGGER log_document_events
  AFTER UPDATE ON uploaded_documents
  FOR EACH ROW EXECUTE FUNCTION log_real_time_event();

-- Create function to clean up old presence data
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS void AS $$
BEGIN
  -- Remove presence records older than 1 hour for offline users
  DELETE FROM user_presence 
  WHERE status = 'offline' 
  AND last_seen < NOW() - INTERVAL '1 hour';
  
  -- Mark users as offline if they haven't been seen in 5 minutes
  UPDATE user_presence 
  SET status = 'offline'
  WHERE status != 'offline' 
  AND last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Create function to send notification
CREATE OR REPLACE FUNCTION send_notification(
  target_user_id UUID,
  notification_type TEXT,
  notification_title TEXT,
  notification_message TEXT,
  notification_action_url TEXT DEFAULT NULL,
  notification_action_label TEXT DEFAULT NULL,
  notification_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO user_notifications (
    user_id,
    type,
    title,
    message,
    action_url,
    action_label,
    metadata
  ) VALUES (
    target_user_id,
    notification_type,
    notification_title,
    notification_message,
    notification_action_url,
    notification_action_label,
    notification_metadata
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the notification function
GRANT EXECUTE ON FUNCTION send_notification TO authenticated;
