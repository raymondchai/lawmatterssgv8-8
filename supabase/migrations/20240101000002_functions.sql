-- Function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_limits(
  user_id UUID,
  operation_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_tier subscription_tier;
  daily_limit INTEGER;
  monthly_limit INTEGER;
  current_daily INTEGER;
  current_monthly INTEGER;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO user_tier
  FROM profiles
  WHERE id = user_id;

  -- Set limits based on tier
  CASE user_tier
    WHEN 'free' THEN
      daily_limit := 5;
      monthly_limit := 50;
    WHEN 'basic' THEN
      daily_limit := 25;
      monthly_limit := 500;
    WHEN 'premium' THEN
      daily_limit := 100;
      monthly_limit := 2000;
    WHEN 'enterprise' THEN
      daily_limit := 1000;
      monthly_limit := 20000;
    ELSE
      daily_limit := 5;
      monthly_limit := 50;
  END CASE;

  -- Get current usage
  SELECT 
    CASE operation_type
      WHEN 'document_upload' THEN daily_document_uploads
      ELSE daily_ai_requests
    END,
    CASE operation_type
      WHEN 'document_upload' THEN monthly_document_uploads
      ELSE monthly_ai_requests
    END
  INTO current_daily, current_monthly
  FROM user_usage
  WHERE user_usage.user_id = check_usage_limits.user_id;

  -- Check if within limits
  RETURN (current_daily < daily_limit AND current_monthly < monthly_limit);
END;
$$;

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding vector(1536),
  similarity_threshold FLOAT DEFAULT 0.7,
  match_count INTEGER DEFAULT 5,
  user_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_text TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    de.id,
    de.document_id,
    de.chunk_text,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM document_embeddings de
  JOIN uploaded_documents ud ON de.document_id = ud.id
  WHERE 
    (user_filter IS NULL OR ud.user_id = user_filter)
    AND (1 - (de.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  
  INSERT INTO user_usage (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to increment usage counters
CREATE OR REPLACE FUNCTION increment_usage(
  user_id UUID,
  operation_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_usage (user_id, daily_ai_requests, monthly_ai_requests, daily_document_uploads, monthly_document_uploads)
  VALUES (user_id, 
    CASE WHEN operation_type = 'document_upload' THEN 0 ELSE 1 END,
    CASE WHEN operation_type = 'document_upload' THEN 0 ELSE 1 END,
    CASE WHEN operation_type = 'document_upload' THEN 1 ELSE 0 END,
    CASE WHEN operation_type = 'document_upload' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    daily_ai_requests = user_usage.daily_ai_requests + 
      CASE WHEN operation_type = 'document_upload' THEN 0 ELSE 1 END,
    monthly_ai_requests = user_usage.monthly_ai_requests + 
      CASE WHEN operation_type = 'document_upload' THEN 0 ELSE 1 END,
    daily_document_uploads = user_usage.daily_document_uploads + 
      CASE WHEN operation_type = 'document_upload' THEN 1 ELSE 0 END,
    monthly_document_uploads = user_usage.monthly_document_uploads + 
      CASE WHEN operation_type = 'document_upload' THEN 1 ELSE 0 END;
END;
$$;
