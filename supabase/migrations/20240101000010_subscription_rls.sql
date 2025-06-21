-- Enable RLS on new subscription-related tables
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_history
CREATE POLICY "Users can view their own subscription history" ON subscription_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscription history" ON subscription_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "System can insert subscription history" ON subscription_history
  FOR INSERT WITH CHECK (true);

-- RLS Policies for payment_history
CREATE POLICY "Users can view their own payment history" ON payment_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment history" ON payment_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "System can insert payment history" ON payment_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update payment history" ON payment_history
  FOR UPDATE USING (true);

-- RLS Policies for usage_tracking
CREATE POLICY "Users can view their own usage tracking" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage tracking" ON usage_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "System can insert usage tracking" ON usage_tracking
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update usage tracking" ON usage_tracking
  FOR UPDATE USING (true);

-- RLS Policies for billing_alerts
CREATE POLICY "Users can view their own billing alerts" ON billing_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own billing alerts" ON billing_alerts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all billing alerts" ON billing_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "System can insert billing alerts" ON billing_alerts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update billing alerts" ON billing_alerts
  FOR UPDATE USING (true);

-- Create function to check subscription limits
CREATE OR REPLACE FUNCTION check_subscription_limit(
  p_user_id UUID,
  p_resource_type TEXT
)
RETURNS JSONB AS $$
DECLARE
  user_tier TEXT;
  current_usage INTEGER;
  tier_limits JSONB;
  resource_limit INTEGER;
  result JSONB;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO user_tier
  FROM profiles
  WHERE id = p_user_id;
  
  -- Define tier limits
  tier_limits := '{
    "free": {
      "ai_query": 10,
      "document_upload": 1,
      "document_download": 1,
      "custom_document": 0
    },
    "premium": {
      "ai_query": 50,
      "document_upload": 10,
      "document_download": 10,
      "custom_document": 3
    },
    "pro": {
      "ai_query": 500,
      "document_upload": 50,
      "document_download": 20,
      "custom_document": 20
    },
    "enterprise": {
      "ai_query": -1,
      "document_upload": -1,
      "document_download": -1,
      "custom_document": -1
    }
  }'::JSONB;
  
  -- Get resource limit for user's tier
  resource_limit := (tier_limits->user_tier->>p_resource_type)::INTEGER;
  
  -- If unlimited (-1), allow
  IF resource_limit = -1 THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'limit', -1,
      'current_usage', 0,
      'remaining', -1
    );
  END IF;
  
  -- Get current month usage
  current_usage := get_monthly_usage(p_user_id, p_resource_type);
  
  -- Build result
  result := jsonb_build_object(
    'allowed', current_usage < resource_limit,
    'limit', resource_limit,
    'current_usage', current_usage,
    'remaining', GREATEST(0, resource_limit - current_usage),
    'tier', user_tier
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create billing alert
CREATE OR REPLACE FUNCTION create_billing_alert(
  p_user_id UUID,
  p_alert_type TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_threshold_percentage INTEGER DEFAULT NULL,
  p_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  alert_id UUID;
  default_message TEXT;
BEGIN
  -- Generate default message if not provided
  IF p_message IS NULL THEN
    CASE p_alert_type
      WHEN 'usage_limit_reached' THEN
        default_message := 'You have reached your monthly limit for ' || p_resource_type || '. Upgrade your plan to continue.';
      WHEN 'usage_limit_warning' THEN
        default_message := 'You have used ' || p_threshold_percentage || '% of your monthly ' || p_resource_type || ' limit.';
      WHEN 'payment_failed' THEN
        default_message := 'Your recent payment failed. Please update your payment method.';
      WHEN 'subscription_cancelled' THEN
        default_message := 'Your subscription has been cancelled and will end at the current billing period.';
      ELSE
        default_message := 'Billing notification';
    END CASE;
  ELSE
    default_message := p_message;
  END IF;
  
  -- Insert alert
  INSERT INTO billing_alerts (
    user_id,
    alert_type,
    resource_type,
    threshold_percentage,
    message
  ) VALUES (
    p_user_id,
    p_alert_type,
    p_resource_type,
    p_threshold_percentage,
    default_message
  ) RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant service role permissions for webhook handling
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
