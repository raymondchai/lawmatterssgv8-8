-- Migration for Template Marketplace
-- This creates the complete template marketplace system with categories, templates, and customization

-- Create template categories table
CREATE TABLE template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  parent_id UUID REFERENCES template_categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category_id UUID REFERENCES template_categories(id) NOT NULL,
  subcategory TEXT,
  
  -- Template content and structure
  content JSONB NOT NULL DEFAULT '{}',
  fields JSONB NOT NULL DEFAULT '[]',
  preview_html TEXT,
  preview_pdf_url TEXT,
  
  -- Access and pricing
  access_level TEXT NOT NULL DEFAULT 'public' CHECK (access_level IN ('public', 'premium', 'enterprise')),
  price_sgd DECIMAL(10,2) DEFAULT 0,
  
  -- Legal and compliance
  jurisdiction TEXT DEFAULT 'Singapore',
  legal_areas TEXT[] DEFAULT '{}',
  compliance_tags TEXT[] DEFAULT '{}',
  last_legal_review TIMESTAMPTZ,
  legal_reviewer_id UUID REFERENCES auth.users(id),
  
  -- Usage and analytics
  download_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'en',
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create template versions table for version history
CREATE TABLE template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL,
  fields JSONB NOT NULL,
  change_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create template customizations table
CREATE TABLE template_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT, -- For anonymous users
  
  -- Customization data
  custom_fields JSONB NOT NULL DEFAULT '{}',
  generated_content TEXT,
  generated_html TEXT,
  generated_pdf_url TEXT,
  
  -- Status and metadata
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed', 'failed')),
  generation_started_at TIMESTAMPTZ,
  generation_completed_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create template downloads table
CREATE TABLE template_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id) NOT NULL,
  customization_id UUID REFERENCES template_customizations(id),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  
  -- Download details
  format TEXT NOT NULL CHECK (format IN ('pdf', 'docx', 'html', 'txt')),
  file_url TEXT,
  file_size BIGINT,
  
  -- Analytics
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create template ratings table
CREATE TABLE template_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(template_id, user_id)
);

-- Create template analytics table
CREATE TABLE template_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id) NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_templates_category ON templates(category_id);
CREATE INDEX idx_templates_access_level ON templates(access_level);
CREATE INDEX idx_templates_active ON templates(is_active);
CREATE INDEX idx_templates_featured ON templates(is_featured);
CREATE INDEX idx_templates_rating ON templates(rating_average DESC);
CREATE INDEX idx_templates_downloads ON templates(download_count DESC);
CREATE INDEX idx_templates_created ON templates(created_at DESC);
CREATE INDEX idx_templates_tags ON templates USING GIN(tags);
CREATE INDEX idx_templates_legal_areas ON templates USING GIN(legal_areas);

CREATE INDEX idx_template_versions_template ON template_versions(template_id, version_number);
CREATE INDEX idx_template_customizations_template ON template_customizations(template_id);
CREATE INDEX idx_template_customizations_user ON template_customizations(user_id);
CREATE INDEX idx_template_customizations_session ON template_customizations(session_id);
CREATE INDEX idx_template_downloads_template ON template_downloads(template_id);
CREATE INDEX idx_template_downloads_user ON template_downloads(user_id);
CREATE INDEX idx_template_ratings_template ON template_ratings(template_id);
CREATE INDEX idx_template_analytics_template ON template_analytics(template_id, created_at);

-- Create storage bucket for template files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'template-files',
  'template-files',
  false,
  5242880, -- 5MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/html', 'text/plain']
);

-- Storage policies for template files
CREATE POLICY "Allow authenticated users to upload template files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'template-files' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow public read access to template files" ON storage.objects
FOR SELECT USING (bucket_id = 'template-files');

CREATE POLICY "Allow template creators to update their files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'template-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Functions for template management

-- Function to update template rating
CREATE OR REPLACE FUNCTION update_template_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE templates
  SET 
    rating_average = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM template_ratings
      WHERE template_id = NEW.template_id
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM template_ratings
      WHERE template_id = NEW.template_id
    ),
    updated_at = NOW()
  WHERE id = NEW.template_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update rating when rating is added/updated
CREATE TRIGGER trigger_update_template_rating
  AFTER INSERT OR UPDATE ON template_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_template_rating();

-- Function to increment download count
CREATE OR REPLACE FUNCTION increment_template_downloads()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE templates
  SET 
    download_count = download_count + 1,
    updated_at = NOW()
  WHERE id = NEW.template_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment download count
CREATE TRIGGER trigger_increment_downloads
  AFTER INSERT ON template_downloads
  FOR EACH ROW
  EXECUTE FUNCTION increment_template_downloads();

-- Function to get popular templates
CREATE OR REPLACE FUNCTION get_popular_templates(
  limit_count INTEGER DEFAULT 10,
  category_filter UUID DEFAULT NULL,
  access_level_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  template_id UUID,
  title TEXT,
  description TEXT,
  category_name TEXT,
  download_count INTEGER,
  rating_average DECIMAL,
  rating_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.description,
    tc.name,
    t.download_count,
    t.rating_average,
    t.rating_count
  FROM templates t
  JOIN template_categories tc ON t.category_id = tc.id
  WHERE t.is_active = true
    AND (category_filter IS NULL OR t.category_id = category_filter)
    AND (access_level_filter IS NULL OR t.access_level = access_level_filter)
  ORDER BY t.download_count DESC, t.rating_average DESC
  LIMIT limit_count;
END;
$$;

-- Function to search templates
CREATE OR REPLACE FUNCTION search_templates(
  search_query TEXT,
  category_filter UUID DEFAULT NULL,
  access_level_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  template_id UUID,
  title TEXT,
  description TEXT,
  category_name TEXT,
  subcategory TEXT,
  access_level TEXT,
  price_sgd DECIMAL,
  download_count INTEGER,
  rating_average DECIMAL,
  rating_count INTEGER,
  relevance_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.description,
    tc.name,
    t.subcategory,
    t.access_level,
    t.price_sgd,
    t.download_count,
    t.rating_average,
    t.rating_count,
    ts_rank(
      to_tsvector('english', t.title || ' ' || t.description || ' ' || array_to_string(t.tags, ' ')),
      plainto_tsquery('english', search_query)
    ) as relevance_score
  FROM templates t
  JOIN template_categories tc ON t.category_id = tc.id
  WHERE t.is_active = true
    AND (
      to_tsvector('english', t.title || ' ' || t.description || ' ' || array_to_string(t.tags, ' '))
      @@ plainto_tsquery('english', search_query)
    )
    AND (category_filter IS NULL OR t.category_id = category_filter)
    AND (access_level_filter IS NULL OR t.access_level = access_level_filter)
  ORDER BY relevance_score DESC, t.download_count DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Enable RLS on all tables
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Template categories - public read, admin write
CREATE POLICY "Allow public read access to template categories" ON template_categories
FOR SELECT USING (is_active = true);

CREATE POLICY "Allow admin to manage template categories" ON template_categories
FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Templates - public read for active templates, authenticated users can rate
CREATE POLICY "Allow public read access to active templates" ON templates
FOR SELECT USING (is_active = true);

CREATE POLICY "Allow template creators to manage their templates" ON templates
FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Allow admin to manage all templates" ON templates
FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Template customizations - users can manage their own
CREATE POLICY "Allow users to manage their customizations" ON template_customizations
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Allow anonymous customizations by session" ON template_customizations
FOR ALL USING (auth.uid() IS NULL AND session_id IS NOT NULL);

-- Template downloads - users can see their own downloads
CREATE POLICY "Allow users to see their downloads" ON template_downloads
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow anonymous downloads by session" ON template_downloads
FOR SELECT USING (auth.uid() IS NULL AND session_id IS NOT NULL);

CREATE POLICY "Allow inserting downloads" ON template_downloads
FOR INSERT WITH CHECK (true);

-- Template ratings - users can manage their own ratings
CREATE POLICY "Allow public read access to ratings" ON template_ratings
FOR SELECT USING (true);

CREATE POLICY "Allow users to manage their ratings" ON template_ratings
FOR ALL USING (auth.uid() = user_id);

-- Template analytics - insert only
CREATE POLICY "Allow inserting analytics events" ON template_analytics
FOR INSERT WITH CHECK (true);

-- Comments
COMMENT ON TABLE template_categories IS 'Categories and subcategories for organizing templates';
COMMENT ON TABLE templates IS 'Legal document templates with content, fields, and metadata';
COMMENT ON TABLE template_versions IS 'Version history for templates';
COMMENT ON TABLE template_customizations IS 'User customizations and generated documents';
COMMENT ON TABLE template_downloads IS 'Download tracking for analytics';
COMMENT ON TABLE template_ratings IS 'User ratings and reviews for templates';
COMMENT ON TABLE template_analytics IS 'Analytics events for template usage tracking';
