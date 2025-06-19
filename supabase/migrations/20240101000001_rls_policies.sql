-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Documents policies
CREATE POLICY "Users can view own documents" ON uploaded_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON uploaded_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON uploaded_documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON uploaded_documents FOR DELETE USING (auth.uid() = user_id);

-- Document embeddings policies
CREATE POLICY "Users can view own document embeddings" ON document_embeddings FOR SELECT USING (
  EXISTS (SELECT 1 FROM uploaded_documents ud WHERE ud.id = document_embeddings.document_id AND ud.user_id = auth.uid())
);
CREATE POLICY "Users can insert own document embeddings" ON document_embeddings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM uploaded_documents ud WHERE ud.id = document_embeddings.document_id AND ud.user_id = auth.uid())
);
CREATE POLICY "Users can update own document embeddings" ON document_embeddings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM uploaded_documents ud WHERE ud.id = document_embeddings.document_id AND ud.user_id = auth.uid())
);
CREATE POLICY "Users can delete own document embeddings" ON document_embeddings FOR DELETE USING (
  EXISTS (SELECT 1 FROM uploaded_documents ud WHERE ud.id = document_embeddings.document_id AND ud.user_id = auth.uid())
);

-- Templates policies
CREATE POLICY "Users can view public templates" ON templates FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view own templates" ON templates FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert own templates" ON templates FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own templates" ON templates FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own templates" ON templates FOR DELETE USING (auth.uid() = created_by);

-- Law firms policies (public read access)
CREATE POLICY "Anyone can view verified law firms" ON law_firms FOR SELECT USING (verified = true);

-- AI usage logs policies
CREATE POLICY "Users can view own AI usage logs" ON ai_usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own AI usage logs" ON ai_usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User usage policies
CREATE POLICY "Users can view own usage" ON user_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage" ON user_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own usage" ON user_usage FOR UPDATE USING (auth.uid() = user_id);
