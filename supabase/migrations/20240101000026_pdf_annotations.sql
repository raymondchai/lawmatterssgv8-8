-- PDF Annotations and Highlights System
-- This migration creates tables for storing PDF annotations, highlights, and comments

-- Create annotation types enum
CREATE TYPE annotation_type AS ENUM ('highlight', 'note', 'drawing', 'text', 'stamp');

-- Create annotation colors enum  
CREATE TYPE annotation_color AS ENUM ('yellow', 'red', 'blue', 'green', 'purple', 'orange', 'pink', 'gray');

-- Create PDF annotations table
CREATE TABLE pdf_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES uploaded_documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER NOT NULL,
  annotation_type annotation_type NOT NULL,
  color annotation_color DEFAULT 'yellow',
  
  -- Position and dimensions (relative to page)
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  
  -- Content and metadata
  content TEXT, -- For notes and text annotations
  selected_text TEXT, -- For highlights - the actual text that was selected
  
  -- Additional properties stored as JSON
  properties JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_position CHECK (x >= 0 AND y >= 0),
  CONSTRAINT valid_dimensions CHECK (width > 0 AND height > 0),
  CONSTRAINT valid_page CHECK (page_number > 0)
);

-- Create annotation comments table (for threaded discussions on annotations)
CREATE TABLE annotation_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID REFERENCES pdf_annotations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  parent_comment_id UUID REFERENCES annotation_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create annotation sharing table (for collaborative annotations)
CREATE TABLE annotation_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID REFERENCES pdf_annotations(id) ON DELETE CASCADE NOT NULL,
  shared_with_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  permission_level TEXT NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'comment', 'edit')),
  shared_by_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique sharing per user per annotation
  UNIQUE(annotation_id, shared_with_user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_pdf_annotations_document_id ON pdf_annotations(document_id);
CREATE INDEX idx_pdf_annotations_user_id ON pdf_annotations(user_id);
CREATE INDEX idx_pdf_annotations_page_number ON pdf_annotations(page_number);
CREATE INDEX idx_pdf_annotations_type ON pdf_annotations(annotation_type);
CREATE INDEX idx_pdf_annotations_created_at ON pdf_annotations(created_at);

CREATE INDEX idx_annotation_comments_annotation_id ON annotation_comments(annotation_id);
CREATE INDEX idx_annotation_comments_user_id ON annotation_comments(user_id);
CREATE INDEX idx_annotation_comments_parent_id ON annotation_comments(parent_comment_id);

CREATE INDEX idx_annotation_shares_annotation_id ON annotation_shares(annotation_id);
CREATE INDEX idx_annotation_shares_shared_with ON annotation_shares(shared_with_user_id);

-- Create updated_at trigger for annotations
CREATE TRIGGER update_pdf_annotations_updated_at 
  BEFORE UPDATE ON pdf_annotations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annotation_comments_updated_at 
  BEFORE UPDATE ON annotation_comments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE pdf_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotation_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotation_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pdf_annotations
CREATE POLICY "Users can view own annotations" ON pdf_annotations FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM annotation_shares 
    WHERE annotation_id = pdf_annotations.id 
    AND shared_with_user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own annotations" ON pdf_annotations FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM uploaded_documents WHERE id = document_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update own annotations" ON pdf_annotations FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM annotation_shares 
    WHERE annotation_id = pdf_annotations.id 
    AND shared_with_user_id = auth.uid() 
    AND permission_level IN ('edit')
  )
);

CREATE POLICY "Users can delete own annotations" ON pdf_annotations FOR DELETE USING (
  auth.uid() = user_id
);

-- RLS Policies for annotation_comments
CREATE POLICY "Users can view comments on accessible annotations" ON annotation_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pdf_annotations 
    WHERE id = annotation_comments.annotation_id 
    AND (
      user_id = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM annotation_shares 
        WHERE annotation_id = pdf_annotations.id 
        AND shared_with_user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can insert comments on accessible annotations" ON annotation_comments FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM pdf_annotations 
    WHERE id = annotation_comments.annotation_id 
    AND (
      user_id = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM annotation_shares 
        WHERE annotation_id = pdf_annotations.id 
        AND shared_with_user_id = auth.uid() 
        AND permission_level IN ('comment', 'edit')
      )
    )
  )
);

CREATE POLICY "Users can update own comments" ON annotation_comments FOR UPDATE USING (
  auth.uid() = user_id
);

CREATE POLICY "Users can delete own comments" ON annotation_comments FOR DELETE USING (
  auth.uid() = user_id
);

-- RLS Policies for annotation_shares
CREATE POLICY "Users can view shares for their annotations" ON annotation_shares FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pdf_annotations 
    WHERE id = annotation_shares.annotation_id 
    AND user_id = auth.uid()
  ) OR shared_with_user_id = auth.uid()
);

CREATE POLICY "Users can share their own annotations" ON annotation_shares FOR INSERT WITH CHECK (
  auth.uid() = shared_by_user_id AND
  EXISTS (
    SELECT 1 FROM pdf_annotations 
    WHERE id = annotation_shares.annotation_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own shares" ON annotation_shares FOR UPDATE USING (
  auth.uid() = shared_by_user_id
);

CREATE POLICY "Users can delete their own shares" ON annotation_shares FOR DELETE USING (
  auth.uid() = shared_by_user_id
);
