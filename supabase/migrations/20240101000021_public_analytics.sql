-- Migration for Public Analytics Tracking
-- This enables tracking of user behavior and conversion metrics for public document analysis

-- Create analytics events table
CREATE TABLE public_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  session_id UUID,
  ip_address INET,
  user_agent TEXT,
  page_url TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_analytics_events_type ON public_analytics_events(event_type);
CREATE INDEX idx_analytics_events_session ON public_analytics_events(session_id);
CREATE INDEX idx_analytics_events_created_at ON public_analytics_events(created_at);
CREATE INDEX idx_analytics_events_ip ON public_analytics_events(ip_address);
CREATE INDEX idx_analytics_events_type_date ON public_analytics_events(event_type, created_at);

-- Create conversion funnel analysis function
CREATE OR REPLACE FUNCTION get_conversion_funnel(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  step TEXT,
  count BIGINT,
  conversion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_sessions BIGINT;
BEGIN
  -- Get total unique sessions in the period
  SELECT COUNT(DISTINCT session_id)
  INTO total_sessions
  FROM public_analytics_events
  WHERE created_at BETWEEN start_date AND end_date
    AND session_id IS NOT NULL;

  -- Return funnel steps with conversion rates
  RETURN QUERY
  WITH funnel_steps AS (
    SELECT 
      'Page Views' as step_name,
      COUNT(DISTINCT session_id) as step_count,
      1 as step_order
    FROM public_analytics_events
    WHERE event_type = 'page_view'
      AND created_at BETWEEN start_date AND end_date
      AND session_id IS NOT NULL
    
    UNION ALL
    
    SELECT 
      'Document Uploads' as step_name,
      COUNT(DISTINCT session_id) as step_count,
      2 as step_order
    FROM public_analytics_events
    WHERE event_type = 'document_upload'
      AND created_at BETWEEN start_date AND end_date
      AND session_id IS NOT NULL
    
    UNION ALL
    
    SELECT 
      'Analysis Completed' as step_name,
      COUNT(DISTINCT session_id) as step_count,
      3 as step_order
    FROM public_analytics_events
    WHERE event_type = 'analysis_complete'
      AND created_at BETWEEN start_date AND end_date
      AND session_id IS NOT NULL
    
    UNION ALL
    
    SELECT 
      'Conversions' as step_name,
      COUNT(DISTINCT session_id) as step_count,
      4 as step_order
    FROM public_analytics_events
    WHERE event_type = 'conversion'
      AND created_at BETWEEN start_date AND end_date
      AND session_id IS NOT NULL
  )
  SELECT 
    fs.step_name,
    fs.step_count,
    CASE 
      WHEN total_sessions > 0 THEN ROUND((fs.step_count::NUMERIC / total_sessions::NUMERIC) * 100, 2)
      ELSE 0
    END as conversion_rate
  FROM funnel_steps fs
  ORDER BY fs.step_order;
END;
$$;

-- Create usage metrics function
CREATE OR REPLACE FUNCTION get_usage_metrics(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_sessions BIGINT,
  total_analyses BIGINT,
  unique_visitors BIGINT,
  conversion_rate NUMERIC,
  avg_session_duration NUMERIC,
  popular_document_types JSONB,
  peak_hours JSONB,
  bounce_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_sess BIGINT;
  total_anal BIGINT;
  unique_vis BIGINT;
  conv_rate NUMERIC;
  avg_duration NUMERIC;
  doc_types JSONB;
  peak_hrs JSONB;
  bounce_rt NUMERIC;
BEGIN
  -- Total sessions
  SELECT COUNT(DISTINCT session_id)
  INTO total_sess
  FROM public_analytics_events
  WHERE created_at BETWEEN start_date AND end_date
    AND session_id IS NOT NULL;

  -- Total analyses
  SELECT COUNT(*)
  INTO total_anal
  FROM public_analytics_events
  WHERE event_type = 'analysis_complete'
    AND created_at BETWEEN start_date AND end_date;

  -- Unique visitors (by IP)
  SELECT COUNT(DISTINCT ip_address)
  INTO unique_vis
  FROM public_analytics_events
  WHERE created_at BETWEEN start_date AND end_date
    AND ip_address IS NOT NULL;

  -- Conversion rate
  WITH conversions AS (
    SELECT COUNT(DISTINCT session_id) as conv_count
    FROM public_analytics_events
    WHERE event_type = 'conversion'
      AND created_at BETWEEN start_date AND end_date
      AND session_id IS NOT NULL
  )
  SELECT 
    CASE 
      WHEN total_sess > 0 THEN ROUND((conv_count::NUMERIC / total_sess::NUMERIC) * 100, 2)
      ELSE 0
    END
  INTO conv_rate
  FROM conversions;

  -- Average session duration
  WITH session_durations AS (
    SELECT 
      session_id,
      MAX((event_data->>'session_duration')::NUMERIC) as duration
    FROM public_analytics_events
    WHERE created_at BETWEEN start_date AND end_date
      AND session_id IS NOT NULL
      AND event_data->>'session_duration' IS NOT NULL
    GROUP BY session_id
  )
  SELECT ROUND(AVG(duration) / 1000, 2) -- Convert to seconds
  INTO avg_duration
  FROM session_durations;

  -- Popular document types
  SELECT json_agg(
    json_build_object(
      'type', doc_type,
      'count', type_count
    ) ORDER BY type_count DESC
  )
  INTO doc_types
  FROM (
    SELECT 
      event_data->>'document_type' as doc_type,
      COUNT(*) as type_count
    FROM public_analytics_events
    WHERE event_type = 'analysis_complete'
      AND created_at BETWEEN start_date AND end_date
      AND event_data->>'document_type' IS NOT NULL
    GROUP BY event_data->>'document_type'
    LIMIT 10
  ) dt;

  -- Peak hours
  SELECT json_agg(
    json_build_object(
      'hour', hour_of_day,
      'count', event_count
    ) ORDER BY event_count DESC
  )
  INTO peak_hrs
  FROM (
    SELECT 
      EXTRACT(HOUR FROM created_at) as hour_of_day,
      COUNT(*) as event_count
    FROM public_analytics_events
    WHERE created_at BETWEEN start_date AND end_date
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY event_count DESC
    LIMIT 24
  ) ph;

  -- Bounce rate (sessions with only one page view)
  WITH session_page_views AS (
    SELECT 
      session_id,
      COUNT(*) as page_view_count
    FROM public_analytics_events
    WHERE event_type = 'page_view'
      AND created_at BETWEEN start_date AND end_date
      AND session_id IS NOT NULL
    GROUP BY session_id
  ),
  bounce_sessions AS (
    SELECT COUNT(*) as bounce_count
    FROM session_page_views
    WHERE page_view_count = 1
  )
  SELECT 
    CASE 
      WHEN total_sess > 0 THEN ROUND((bounce_count::NUMERIC / total_sess::NUMERIC) * 100, 2)
      ELSE 0
    END
  INTO bounce_rt
  FROM bounce_sessions;

  -- Return all metrics
  RETURN QUERY SELECT 
    total_sess,
    total_anal,
    unique_vis,
    COALESCE(conv_rate, 0),
    COALESCE(avg_duration, 0),
    COALESCE(doc_types, '[]'::jsonb),
    COALESCE(peak_hrs, '[]'::jsonb),
    COALESCE(bounce_rt, 0);
END;
$$;

-- Create function to clean up old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_analytics_data(
  retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public_analytics_events
  WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Create function to get real-time analytics dashboard data
CREATE OR REPLACE FUNCTION get_realtime_analytics()
RETURNS TABLE (
  active_sessions BIGINT,
  analyses_today BIGINT,
  analyses_this_hour BIGINT,
  top_document_types JSONB,
  recent_errors JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_sess BIGINT;
  analyses_today_count BIGINT;
  analyses_hour_count BIGINT;
  top_doc_types JSONB;
  recent_errs JSONB;
BEGIN
  -- Active sessions (sessions with activity in last 30 minutes)
  SELECT COUNT(DISTINCT session_id)
  INTO active_sess
  FROM public_analytics_events
  WHERE created_at > NOW() - INTERVAL '30 minutes'
    AND session_id IS NOT NULL;

  -- Analyses today
  SELECT COUNT(*)
  INTO analyses_today_count
  FROM public_analytics_events
  WHERE event_type = 'analysis_complete'
    AND created_at >= CURRENT_DATE;

  -- Analyses this hour
  SELECT COUNT(*)
  INTO analyses_hour_count
  FROM public_analytics_events
  WHERE event_type = 'analysis_complete'
    AND created_at >= DATE_TRUNC('hour', NOW());

  -- Top document types today
  SELECT json_agg(
    json_build_object(
      'type', doc_type,
      'count', type_count
    ) ORDER BY type_count DESC
  )
  INTO top_doc_types
  FROM (
    SELECT 
      event_data->>'document_type' as doc_type,
      COUNT(*) as type_count
    FROM public_analytics_events
    WHERE event_type = 'analysis_complete'
      AND created_at >= CURRENT_DATE
      AND event_data->>'document_type' IS NOT NULL
    GROUP BY event_data->>'document_type'
    LIMIT 5
  ) dt;

  -- Recent errors
  SELECT json_agg(
    json_build_object(
      'error_type', event_data->>'error_type',
      'error_message', event_data->>'error_message',
      'timestamp', created_at,
      'session_id', session_id
    ) ORDER BY created_at DESC
  )
  INTO recent_errs
  FROM public_analytics_events
  WHERE event_type = 'error'
    AND created_at > NOW() - INTERVAL '1 hour'
  LIMIT 10;

  -- Return all data
  RETURN QUERY SELECT 
    active_sess,
    analyses_today_count,
    analyses_hour_count,
    COALESCE(top_doc_types, '[]'::jsonb),
    COALESCE(recent_errs, '[]'::jsonb);
END;
$$;

-- Enable RLS on analytics table
ALTER TABLE public_analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow all operations on analytics events (no authentication required for public analytics)
CREATE POLICY "Allow all operations on analytics events" ON public_analytics_events
FOR ALL USING (true) WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE public_analytics_events IS 'Tracks user behavior and events for public document analysis feature';
COMMENT ON FUNCTION get_conversion_funnel(TIMESTAMPTZ, TIMESTAMPTZ) IS 'Returns conversion funnel data for specified date range';
COMMENT ON FUNCTION get_usage_metrics(TIMESTAMPTZ, TIMESTAMPTZ) IS 'Returns comprehensive usage metrics for specified date range';
COMMENT ON FUNCTION cleanup_old_analytics_data(INTEGER) IS 'Cleans up analytics data older than specified retention period';
COMMENT ON FUNCTION get_realtime_analytics() IS 'Returns real-time analytics data for dashboard';
