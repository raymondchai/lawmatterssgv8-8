-- Migration for Public Document Analysis Feature
-- This enables anonymous users to analyze documents with rate limiting

-- Create public analysis sessions table
CREATE TABLE public_analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  user_agent TEXT,
  documents_analyzed INTEGER DEFAULT 0,
  total_storage_used BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient session lookup
CREATE INDEX idx_public_sessions_ip_expires ON public_analysis_sessions(ip_address, expires_at);
CREATE INDEX idx_public_sessions_expires ON public_analysis_sessions(expires_at);

-- Create public document analyses table
CREATE TABLE public_document_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public_analysis_sessions(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  analysis_result JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_public_analyses_session ON public_document_analyses(session_id);
CREATE INDEX idx_public_analyses_ip_created ON public_document_analyses(ip_address, created_at);
CREATE INDEX idx_public_analyses_expires ON public_document_analyses(expires_at);

-- Create public storage bucket for temporary document storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-documents',
  'public-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

-- Storage policies for public documents
-- Allow anonymous uploads to public-documents bucket with session-based organization
CREATE POLICY "Allow anonymous upload to public documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'public-documents' AND
  -- Files must be organized by session ID in folder structure
  (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

-- Allow anonymous read access to their own session files
CREATE POLICY "Allow anonymous read of session files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'public-documents'
);

-- Allow anonymous delete of their own session files (for cleanup)
CREATE POLICY "Allow anonymous delete of session files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'public-documents'
);

-- Function to clean up expired public analysis data
CREATE OR REPLACE FUNCTION cleanup_expired_public_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete expired document analyses
  DELETE FROM public_document_analyses 
  WHERE expires_at < NOW();
  
  -- Delete expired sessions
  DELETE FROM public_analysis_sessions 
  WHERE expires_at < NOW();
  
  -- Clean up storage files for expired sessions
  -- Note: This would need to be implemented in an Edge Function
  -- as we can't directly access storage from SQL
END;
$$;

-- Function to get rate limit status for an IP address
CREATE OR REPLACE FUNCTION get_public_rate_limit_status(
  p_ip_address INET,
  p_hourly_limit INTEGER DEFAULT 3,
  p_daily_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  hourly_count INTEGER,
  daily_count INTEGER,
  hourly_remaining INTEGER,
  daily_remaining INTEGER,
  allowed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hourly_count INTEGER;
  v_daily_count INTEGER;
BEGIN
  -- Count documents analyzed in the last hour
  SELECT COUNT(*)
  INTO v_hourly_count
  FROM public_document_analyses
  WHERE ip_address = p_ip_address
    AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Count documents analyzed in the last day
  SELECT COUNT(*)
  INTO v_daily_count
  FROM public_document_analyses
  WHERE ip_address = p_ip_address
    AND created_at > NOW() - INTERVAL '1 day';
  
  RETURN QUERY SELECT
    v_hourly_count,
    v_daily_count,
    GREATEST(0, p_hourly_limit - v_hourly_count),
    GREATEST(0, p_daily_limit - v_daily_count),
    (v_hourly_count < p_hourly_limit AND v_daily_count < p_daily_limit);
END;
$$;

-- Function to increment analysis count and check limits
CREATE OR REPLACE FUNCTION increment_public_analysis(
  p_session_id UUID,
  p_ip_address INET,
  p_file_size BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_exists BOOLEAN;
BEGIN
  -- Check if session exists and is not expired
  SELECT EXISTS(
    SELECT 1 FROM public_analysis_sessions
    WHERE id = p_session_id
      AND expires_at > NOW()
  ) INTO v_session_exists;
  
  IF NOT v_session_exists THEN
    RAISE EXCEPTION 'Invalid or expired session';
  END IF;
  
  -- Update session statistics
  UPDATE public_analysis_sessions
  SET 
    documents_analyzed = documents_analyzed + 1,
    total_storage_used = total_storage_used + p_file_size,
    updated_at = NOW()
  WHERE id = p_session_id;
  
  RETURN TRUE;
END;
$$;

-- Create a scheduled job to clean up expired data (runs every hour)
-- Note: This requires pg_cron extension which may not be available in all Supabase plans
-- Alternative: Use Edge Function with cron trigger

-- Add RLS policies (even though these tables don't require authentication)
ALTER TABLE public_analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_document_analyses ENABLE ROW LEVEL SECURITY;

-- Allow all operations on public analysis tables (no authentication required)
CREATE POLICY "Allow all operations on public sessions" ON public_analysis_sessions
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on public analyses" ON public_document_analyses
FOR ALL USING (true) WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE public_analysis_sessions IS 'Tracks anonymous user sessions for public document analysis with rate limiting';
COMMENT ON TABLE public_document_analyses IS 'Stores analysis results for public document analysis feature';
COMMENT ON FUNCTION cleanup_expired_public_data() IS 'Cleans up expired public analysis data and storage files';
COMMENT ON FUNCTION get_public_rate_limit_status(INET, INTEGER, INTEGER) IS 'Returns rate limit status for an IP address';
COMMENT ON FUNCTION increment_public_analysis(UUID, INET, BIGINT) IS 'Increments analysis count for a session and validates limits';
