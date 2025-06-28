-- Create knowledge base table for RAG system
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('legal_document', 'case_law', 'statute', 'regulation', 'faq', 'guide')),
  metadata JSONB DEFAULT '{}',
  embedding vector(1536), -- OpenAI ada-002 embedding dimension
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source ON knowledge_base(source);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_created_at ON knowledge_base(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_metadata_practice_area ON knowledge_base USING GIN ((metadata->>'practice_area'));
CREATE INDEX IF NOT EXISTS idx_knowledge_base_metadata_jurisdiction ON knowledge_base USING GIN ((metadata->>'jurisdiction'));

-- Create vector similarity index (requires pgvector extension)
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function to search knowledge base using vector similarity
CREATE OR REPLACE FUNCTION search_knowledge_base(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  category_filter text DEFAULT NULL,
  practice_area_filter text DEFAULT NULL,
  jurisdiction_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  title text,
  source text,
  category text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kb.id,
    kb.content,
    kb.title,
    kb.source,
    kb.category,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) as similarity
  FROM knowledge_base kb
  WHERE 
    (1 - (kb.embedding <=> query_embedding)) > similarity_threshold
    AND (category_filter IS NULL OR kb.category = category_filter)
    AND (practice_area_filter IS NULL OR kb.metadata->>'practice_area' = practice_area_filter)
    AND (jurisdiction_filter IS NULL OR kb.metadata->>'jurisdiction' = jurisdiction_filter)
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get knowledge base statistics
CREATE OR REPLACE FUNCTION get_knowledge_base_stats()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  total_chunks int;
  category_counts jsonb;
  practice_area_counts jsonb;
BEGIN
  -- Get total chunks
  SELECT COUNT(*) INTO total_chunks FROM knowledge_base;
  
  -- Get category counts
  SELECT jsonb_object_agg(category, count)
  INTO category_counts
  FROM (
    SELECT category, COUNT(*) as count
    FROM knowledge_base
    GROUP BY category
  ) t;
  
  -- Get practice area counts
  SELECT jsonb_object_agg(practice_area, count)
  INTO practice_area_counts
  FROM (
    SELECT 
      COALESCE(metadata->>'practice_area', 'Unknown') as practice_area,
      COUNT(*) as count
    FROM knowledge_base
    WHERE metadata->>'practice_area' IS NOT NULL
    GROUP BY metadata->>'practice_area'
  ) t;
  
  -- Build result
  result := jsonb_build_object(
    'totalChunks', total_chunks,
    'categoryCounts', COALESCE(category_counts, '{}'::jsonb),
    'practiceAreaCounts', COALESCE(practice_area_counts, '{}'::jsonb)
  );
  
  RETURN result;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_knowledge_base_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to read all knowledge
CREATE POLICY "Allow authenticated users to read knowledge" ON knowledge_base
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert knowledge
CREATE POLICY "Allow authenticated users to insert knowledge" ON knowledge_base
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow users to update their own knowledge or admins to update any
CREATE POLICY "Allow users to update own knowledge or admins update any" ON knowledge_base
  FOR UPDATE TO authenticated USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Allow users to delete their own knowledge or admins to delete any
CREATE POLICY "Allow users to delete own knowledge or admins delete any" ON knowledge_base
  FOR DELETE TO authenticated USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Insert some sample Singapore legal knowledge
INSERT INTO knowledge_base (content, title, source, category, metadata, created_by) VALUES
(
  'The Employment Act is the main legislation governing employment practices in Singapore. It covers areas such as working hours, overtime pay, annual leave, sick leave, and termination procedures. The Act applies to all employees earning up to $4,500 per month, with some provisions applying to all employees regardless of salary.',
  'Employment Act Overview',
  'Singapore Statutes Online',
  'statute',
  '{"practice_area": "Employment Law", "jurisdiction": "Singapore", "authority": "Ministry of Manpower"}',
  NULL
),
(
  'Under the Employment Act, the maximum working hours for non-workmen is 44 hours per week and 8 hours per day. For workmen, it is 44 hours per week. Overtime must be paid at 1.5 times the basic rate of pay for work beyond normal hours.',
  'Working Hours and Overtime',
  'Employment Act Section 38',
  'statute',
  '{"practice_area": "Employment Law", "jurisdiction": "Singapore", "section": "38"}',
  NULL
),
(
  'The Personal Data Protection Act (PDPA) governs the collection, use, and disclosure of personal data in Singapore. Organizations must obtain consent before collecting personal data and must implement reasonable security arrangements to protect the data.',
  'Personal Data Protection Act Basics',
  'PDPC Guidelines',
  'statute',
  '{"practice_area": "Data Protection", "jurisdiction": "Singapore", "authority": "PDPC"}',
  NULL
),
(
  'In Singapore, the limitation period for most civil claims is 6 years from the date the cause of action accrued. However, there are exceptions - for example, claims for personal injury have a 3-year limitation period.',
  'Limitation Periods for Civil Claims',
  'Limitation Act',
  'statute',
  '{"practice_area": "Civil Litigation", "jurisdiction": "Singapore", "key_concept": "limitation periods"}',
  NULL
),
(
  'A contract in Singapore law requires offer, acceptance, consideration, and intention to create legal relations. The parties must have the capacity to contract. Contracts can be written or oral, though certain types of contracts must be in writing.',
  'Contract Formation Requirements',
  'Singapore Contract Law Principles',
  'legal_document',
  '{"practice_area": "Contract Law", "jurisdiction": "Singapore", "key_concept": "contract formation"}',
  NULL
);

-- Create a function to add knowledge with automatic embedding (for future use)
CREATE OR REPLACE FUNCTION add_knowledge_with_embedding(
  p_content text,
  p_title text,
  p_source text,
  p_category text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO knowledge_base (content, title, source, category, metadata, created_by)
  VALUES (p_content, p_title, p_source, p_category, p_metadata, auth.uid())
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;
