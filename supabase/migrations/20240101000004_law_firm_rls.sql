-- Enable RLS on law firm tables
ALTER TABLE law_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_firm_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_firm_review_votes ENABLE ROW LEVEL SECURITY;

-- Law firms policies
-- Anyone can read verified law firms
CREATE POLICY "Anyone can read verified law firms" ON law_firms
  FOR SELECT USING (verified = true);

-- Authenticated users can read all law firms (for admin purposes)
CREATE POLICY "Authenticated users can read all law firms" ON law_firms
  FOR SELECT TO authenticated USING (true);

-- Only admins can insert law firms (for now)
CREATE POLICY "Only admins can insert law firms" ON law_firms
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Only admins can update law firms
CREATE POLICY "Only admins can update law firms" ON law_firms
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Only admins can delete law firms
CREATE POLICY "Only admins can delete law firms" ON law_firms
  FOR DELETE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Law firm reviews policies
-- Anyone can read approved reviews
CREATE POLICY "Anyone can read approved reviews" ON law_firm_reviews
  FOR SELECT USING (status = 'approved');

-- Authenticated users can read their own reviews (any status)
CREATE POLICY "Users can read their own reviews" ON law_firm_reviews
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Admins can read all reviews
CREATE POLICY "Admins can read all reviews" ON law_firm_reviews
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Authenticated users can insert reviews
CREATE POLICY "Authenticated users can insert reviews" ON law_firm_reviews
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

-- Users can update their own pending reviews
CREATE POLICY "Users can update their own pending reviews" ON law_firm_reviews
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());

-- Admins can update any review (for moderation)
CREATE POLICY "Admins can update any review" ON law_firm_reviews
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews" ON law_firm_reviews
  FOR DELETE TO authenticated 
  USING (user_id = auth.uid());

-- Admins can delete any review
CREATE POLICY "Admins can delete any review" ON law_firm_reviews
  FOR DELETE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Law firm review votes policies
-- Anyone can read votes (for displaying helpful counts)
CREATE POLICY "Anyone can read review votes" ON law_firm_review_votes
  FOR SELECT USING (true);

-- Authenticated users can insert votes
CREATE POLICY "Authenticated users can insert votes" ON law_firm_review_votes
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

-- Users can update their own votes
CREATE POLICY "Users can update their own votes" ON law_firm_review_votes
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own votes
CREATE POLICY "Users can delete their own votes" ON law_firm_review_votes
  FOR DELETE TO authenticated 
  USING (user_id = auth.uid());
