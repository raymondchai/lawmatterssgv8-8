-- Create document_annotations table for PDF annotations
CREATE TABLE document_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES uploaded_documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('highlight', 'note', 'sticky')),
  page_number INTEGER NOT NULL DEFAULT 1,
  position JSONB NOT NULL, -- {x, y, width?, height?}
  content TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#ffeb3b',
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create annotation_replies table for threaded discussions
CREATE TABLE annotation_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID REFERENCES document_annotations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create annotation_collaborators table for document sharing
CREATE TABLE annotation_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES uploaded_documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('view', 'comment', 'edit')) DEFAULT 'comment',
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_document_annotations_document_id ON document_annotations(document_id);
CREATE INDEX idx_document_annotations_user_id ON document_annotations(user_id);
CREATE INDEX idx_document_annotations_page ON document_annotations(document_id, page_number);
CREATE INDEX idx_annotation_replies_annotation_id ON annotation_replies(annotation_id);
CREATE INDEX idx_annotation_collaborators_document_id ON annotation_collaborators(document_id);
CREATE INDEX idx_annotation_collaborators_user_id ON annotation_collaborators(user_id);

-- Enable RLS on annotation tables
ALTER TABLE document_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotation_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotation_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_annotations
-- Users can view annotations on documents they own or are collaborators on
CREATE POLICY "Users can view annotations on accessible documents" ON document_annotations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM uploaded_documents ud 
      WHERE ud.id = document_annotations.document_id 
      AND ud.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM annotation_collaborators ac
      WHERE ac.document_id = document_annotations.document_id
      AND ac.user_id = auth.uid()
      AND ac.status = 'accepted'
    )
  );

-- Users can create annotations on documents they have comment/edit access to
CREATE POLICY "Users can create annotations on accessible documents" ON document_annotations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM uploaded_documents ud 
      WHERE ud.id = document_annotations.document_id 
      AND ud.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM annotation_collaborators ac
      WHERE ac.document_id = document_annotations.document_id
      AND ac.user_id = auth.uid()
      AND ac.status = 'accepted'
      AND ac.permission_level IN ('comment', 'edit')
    )
  );

-- Users can update their own annotations or if they have edit access
CREATE POLICY "Users can update their own annotations or with edit access" ON document_annotations
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM annotation_collaborators ac
      WHERE ac.document_id = document_annotations.document_id
      AND ac.user_id = auth.uid()
      AND ac.status = 'accepted'
      AND ac.permission_level = 'edit'
    )
  );

-- Users can delete their own annotations or document owners can delete any
CREATE POLICY "Users can delete their own annotations or document owners can delete any" ON document_annotations
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM uploaded_documents ud 
      WHERE ud.id = document_annotations.document_id 
      AND ud.user_id = auth.uid()
    )
  );

-- RLS Policies for annotation_replies
-- Users can view replies on annotations they can see
CREATE POLICY "Users can view replies on accessible annotations" ON annotation_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM document_annotations da
      JOIN uploaded_documents ud ON ud.id = da.document_id
      WHERE da.id = annotation_replies.annotation_id
      AND (
        ud.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM annotation_collaborators ac
          WHERE ac.document_id = da.document_id
          AND ac.user_id = auth.uid()
          AND ac.status = 'accepted'
        )
      )
    )
  );

-- Users can create replies on annotations they can see
CREATE POLICY "Users can create replies on accessible annotations" ON annotation_replies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM document_annotations da
      JOIN uploaded_documents ud ON ud.id = da.document_id
      WHERE da.id = annotation_replies.annotation_id
      AND (
        ud.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM annotation_collaborators ac
          WHERE ac.document_id = da.document_id
          AND ac.user_id = auth.uid()
          AND ac.status = 'accepted'
          AND ac.permission_level IN ('comment', 'edit')
        )
      )
    )
  );

-- Users can update/delete their own replies
CREATE POLICY "Users can manage their own replies" ON annotation_replies
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for annotation_collaborators
-- Users can view collaborators on documents they own or are collaborators on
CREATE POLICY "Users can view collaborators on accessible documents" ON annotation_collaborators
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM uploaded_documents ud 
      WHERE ud.id = annotation_collaborators.document_id 
      AND ud.user_id = auth.uid()
    )
  );

-- Only document owners can manage collaborators
CREATE POLICY "Document owners can manage collaborators" ON annotation_collaborators
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM uploaded_documents ud 
      WHERE ud.id = annotation_collaborators.document_id 
      AND ud.user_id = auth.uid()
    )
  );

-- Users can update their own collaboration status (accept/decline invitations)
CREATE POLICY "Users can update their own collaboration status" ON annotation_collaborators
  FOR UPDATE USING (user_id = auth.uid());

-- Create function to update annotation updated_at timestamp
CREATE OR REPLACE FUNCTION update_annotation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_document_annotations_updated_at
  BEFORE UPDATE ON document_annotations
  FOR EACH ROW EXECUTE FUNCTION update_annotation_updated_at();

CREATE TRIGGER update_annotation_replies_updated_at
  BEFORE UPDATE ON annotation_replies
  FOR EACH ROW EXECUTE FUNCTION update_annotation_updated_at();

CREATE TRIGGER update_annotation_collaborators_updated_at
  BEFORE UPDATE ON annotation_collaborators
  FOR EACH ROW EXECUTE FUNCTION update_annotation_updated_at();
