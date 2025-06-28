# 🚀 RAG System Setup Guide

## 📋 **Quick Setup Checklist**

### **1. Database Setup**
You need to run the database migration to create the knowledge base table:

```bash
# Option 1: Using Supabase CLI (if you have it)
npx supabase db push

# Option 2: Run the SQL directly in Supabase Dashboard
# Go to SQL Editor and run the migration file content
```

### **2. Required Extensions**
Make sure your Supabase project has the `vector` extension enabled:

```sql
-- Run this in Supabase SQL Editor if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;
```

### **3. Environment Variables**
Ensure you have OpenAI API key configured:

```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

---

## 🗄️ **Database Migration**

### **Manual Setup (If Migration Fails)**
If the automatic migration doesn't work, run this SQL in your Supabase SQL Editor:

```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge base table
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('legal_document', 'case_law', 'statute', 'regulation', 'faq', 'guide')),
  metadata JSONB DEFAULT '{}',
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source ON knowledge_base(source);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_created_at ON knowledge_base(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_metadata_practice_area ON knowledge_base USING GIN ((metadata->>'practice_area'));
CREATE INDEX IF NOT EXISTS idx_knowledge_base_metadata_jurisdiction ON knowledge_base USING GIN ((metadata->>'jurisdiction'));
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create search function
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

-- Create stats function
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
  SELECT COUNT(*) INTO total_chunks FROM knowledge_base;
  
  SELECT jsonb_object_agg(category, count)
  INTO category_counts
  FROM (
    SELECT category, COUNT(*) as count
    FROM knowledge_base
    GROUP BY category
  ) t;
  
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
  
  result := jsonb_build_object(
    'totalChunks', total_chunks,
    'categoryCounts', COALESCE(category_counts, '{}'::jsonb),
    'practiceAreaCounts', COALESCE(practice_area_counts, '{}'::jsonb)
  );
  
  RETURN result;
END;
$$;

-- Enable RLS
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to read knowledge" ON knowledge_base
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert knowledge" ON knowledge_base
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow users to update own knowledge or admins update any" ON knowledge_base
  FOR UPDATE TO authenticated USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow users to delete own knowledge or admins delete any" ON knowledge_base
  FOR DELETE TO authenticated USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Insert sample data
INSERT INTO knowledge_base (content, title, source, category, metadata) VALUES
(
  'The Employment Act is the main legislation governing employment practices in Singapore. It covers areas such as working hours, overtime pay, annual leave, sick leave, and termination procedures. The Act applies to all employees earning up to $4,500 per month, with some provisions applying to all employees regardless of salary.',
  'Employment Act Overview',
  'Singapore Statutes Online',
  'statute',
  '{"practice_area": "Employment Law", "jurisdiction": "Singapore", "authority": "Ministry of Manpower"}'
),
(
  'Under the Employment Act, the maximum working hours for non-workmen is 44 hours per week and 8 hours per day. For workmen, it is 44 hours per week. Overtime must be paid at 1.5 times the basic rate of pay for work beyond normal hours.',
  'Working Hours and Overtime',
  'Employment Act Section 38',
  'statute',
  '{"practice_area": "Employment Law", "jurisdiction": "Singapore", "section": "38"}'
),
(
  'The Personal Data Protection Act (PDPA) governs the collection, use, and disclosure of personal data in Singapore. Organizations must obtain consent before collecting personal data and must implement reasonable security arrangements to protect the data.',
  'Personal Data Protection Act Basics',
  'PDPC Guidelines',
  'statute',
  '{"practice_area": "Data Protection", "jurisdiction": "Singapore", "authority": "PDPC"}'
);
```

---

## ✅ **Verification Steps**

### **1. Check Database Setup**
```sql
-- Verify table exists
SELECT COUNT(*) FROM knowledge_base;

-- Check sample data
SELECT title, category FROM knowledge_base LIMIT 5;

-- Test search function
SELECT search_knowledge_base(
  '[0.1, 0.2, 0.3]'::vector(1536),  -- dummy embedding
  0.5,  -- threshold
  5     -- max results
);
```

### **2. Test RAG System**
1. Go to `/dashboard/rag-knowledge`
2. Check the "Statistics" tab shows data
3. Try adding new knowledge
4. Test the RAG chat functionality

---

## 🔧 **Troubleshooting**

### **Common Issues**

**1. Vector Extension Missing**
```
Error: type "vector" does not exist
```
**Solution**: Enable the vector extension in Supabase Dashboard → Database → Extensions

**2. OpenAI API Key Missing**
```
Error: OpenAI API key not configured
```
**Solution**: Add `VITE_OPENAI_API_KEY` to your environment variables

**3. RLS Policy Issues**
```
Error: new row violates row-level security policy
```
**Solution**: Make sure you're authenticated and the RLS policies are correctly set

**4. Embedding Generation Fails**
```
Error: Failed to generate embedding
```
**Solution**: Check your OpenAI API key and ensure you have credits

---

## 🎯 **Next Steps**

1. **Deploy the updated application** with the new `dist` folder
2. **Run the database migration** using the SQL above
3. **Test the RAG system** with some legal questions
4. **Add your legal knowledge** to improve responses
5. **Monitor usage** and optimize based on feedback

Your RAG system is now ready to provide intelligent legal assistance! 🚀
