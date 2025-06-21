-- Template Access Control System
-- This migration adds subscription management and usage tracking for template access control

-- User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'premium', 'pro', 'enterprise')),
    status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'trialing')),
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Usage Tracking Table
CREATE TABLE IF NOT EXISTS user_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    templates_used_this_month INTEGER DEFAULT 0,
    templates_used_today INTEGER DEFAULT 0,
    customizations_this_month INTEGER DEFAULT 0,
    downloads_this_month INTEGER DEFAULT 0,
    last_reset_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template Usage Events Table (for detailed tracking)
CREATE TABLE IF NOT EXISTS template_usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'customize', 'download')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add access_level to templates table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'access_level') THEN
        ALTER TABLE templates ADD COLUMN access_level TEXT DEFAULT 'public' CHECK (access_level IN ('public', 'premium', 'enterprise'));
    END IF;
END $$;

-- Add is_verified to template_ratings table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'template_ratings' AND column_name = 'is_verified') THEN
        ALTER TABLE template_ratings ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id ON user_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_last_reset_date ON user_usage(last_reset_date);

CREATE INDEX IF NOT EXISTS idx_template_usage_events_user_id ON template_usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_events_template_id ON template_usage_events(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_events_event_type ON template_usage_events(event_type);
CREATE INDEX IF NOT EXISTS idx_template_usage_events_created_at ON template_usage_events(created_at);

CREATE INDEX IF NOT EXISTS idx_templates_access_level ON templates(access_level);

-- Function to increment template usage
CREATE OR REPLACE FUNCTION increment_template_usage(
    p_user_id UUID,
    p_action TEXT
) RETURNS VOID AS $$
DECLARE
    current_date DATE := CURRENT_DATE;
    current_month_start DATE := DATE_TRUNC('month', CURRENT_DATE);
BEGIN
    -- Insert or update user usage record
    INSERT INTO user_usage (user_id, last_reset_date)
    VALUES (p_user_id, current_month_start)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Update usage counters based on action
    CASE p_action
        WHEN 'view' THEN
            UPDATE user_usage 
            SET 
                templates_used_this_month = CASE 
                    WHEN DATE_TRUNC('month', last_reset_date) < current_month_start THEN 1
                    ELSE templates_used_this_month + 1
                END,
                templates_used_today = CASE 
                    WHEN DATE_TRUNC('day', updated_at) < current_date THEN 1
                    ELSE templates_used_today + 1
                END,
                last_reset_date = CASE 
                    WHEN DATE_TRUNC('month', last_reset_date) < current_month_start THEN current_month_start
                    ELSE last_reset_date
                END,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
        WHEN 'customize' THEN
            UPDATE user_usage 
            SET 
                customizations_this_month = CASE 
                    WHEN DATE_TRUNC('month', last_reset_date) < current_month_start THEN 1
                    ELSE customizations_this_month + 1
                END,
                last_reset_date = CASE 
                    WHEN DATE_TRUNC('month', last_reset_date) < current_month_start THEN current_month_start
                    ELSE last_reset_date
                END,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
        WHEN 'download' THEN
            UPDATE user_usage 
            SET 
                downloads_this_month = CASE 
                    WHEN DATE_TRUNC('month', last_reset_date) < current_month_start THEN 1
                    ELSE downloads_this_month + 1
                END,
                last_reset_date = CASE 
                    WHEN DATE_TRUNC('month', last_reset_date) < current_month_start THEN current_month_start
                    ELSE last_reset_date
                END,
                updated_at = NOW()
            WHERE user_id = p_user_id;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly usage counters
CREATE OR REPLACE FUNCTION reset_monthly_usage() RETURNS VOID AS $$
BEGIN
    UPDATE user_usage 
    SET 
        templates_used_this_month = 0,
        customizations_this_month = 0,
        downloads_this_month = 0,
        last_reset_date = DATE_TRUNC('month', CURRENT_DATE),
        updated_at = NOW()
    WHERE DATE_TRUNC('month', last_reset_date) < DATE_TRUNC('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset daily usage counters
CREATE OR REPLACE FUNCTION reset_daily_usage() RETURNS VOID AS $$
BEGIN
    UPDATE user_usage 
    SET 
        templates_used_today = 0,
        updated_at = NOW()
    WHERE DATE_TRUNC('day', updated_at) < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_usage_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_usage
CREATE POLICY "Users can view their own usage" ON user_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage" ON user_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" ON user_usage
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for template_usage_events
CREATE POLICY "Users can view their own usage events" ON template_usage_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage events" ON template_usage_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON user_subscriptions TO authenticated;
GRANT ALL ON user_usage TO authenticated;
GRANT ALL ON template_usage_events TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION increment_template_usage(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_monthly_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_daily_usage() TO authenticated;

-- Insert default free subscription for existing users
INSERT INTO user_subscriptions (user_id, tier, status, current_period_start, current_period_end)
SELECT 
    id,
    'free',
    'active',
    NOW(),
    NOW() + INTERVAL '1 year'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- Update existing templates to have access levels
UPDATE templates 
SET access_level = 'public' 
WHERE access_level IS NULL;

-- Set some premium templates (you can adjust this based on your needs)
UPDATE templates 
SET access_level = 'premium' 
WHERE category_id IN (
    SELECT id FROM template_categories 
    WHERE name IN ('Corporate Documents', 'Intellectual Property')
)
AND access_level = 'public';

-- Set some enterprise templates
UPDATE templates 
SET access_level = 'enterprise' 
WHERE category_id IN (
    SELECT id FROM template_categories 
    WHERE name IN ('Compliance & Regulatory')
)
AND access_level = 'public';

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_usage_updated_at
    BEFORE UPDATE ON user_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
