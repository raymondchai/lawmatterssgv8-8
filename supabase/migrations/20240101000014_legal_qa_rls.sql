-- RLS Policies for Legal Q&A System

-- Enable RLS on all Q&A tables
ALTER TABLE legal_qa_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_qa_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_qa_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_qa_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_qa_reports ENABLE ROW LEVEL SECURITY;

-- Legal Q&A Categories Policies
-- Public can view active categories
CREATE POLICY "Public can view active categories" ON legal_qa_categories
  FOR SELECT USING (is_active = true);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories" ON legal_qa_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Legal Questions Policies
-- Public can view approved questions
CREATE POLICY "Public can view approved questions" ON legal_questions
  FOR SELECT USING (moderation_status = 'approved');

-- Users can view their own questions regardless of status
CREATE POLICY "Users can view own questions" ON legal_questions
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can create questions
CREATE POLICY "Users can create questions" ON legal_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending questions
CREATE POLICY "Users can update own pending questions" ON legal_questions
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    moderation_status = 'pending'
  );

-- Moderators and admins can manage all questions
CREATE POLICY "Moderators can manage questions" ON legal_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('moderator', 'admin', 'super_admin')
    )
  );

-- Legal Answers Policies
-- Public can view approved answers for approved questions
CREATE POLICY "Public can view approved answers" ON legal_answers
  FOR SELECT USING (
    moderation_status = 'approved' AND
    EXISTS (
      SELECT 1 FROM legal_questions 
      WHERE id = legal_answers.question_id 
      AND moderation_status = 'approved'
    )
  );

-- Users can view their own answers regardless of status
CREATE POLICY "Users can view own answers" ON legal_answers
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can create answers for approved questions
CREATE POLICY "Users can create answers" ON legal_answers
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM legal_questions 
      WHERE id = legal_answers.question_id 
      AND moderation_status = 'approved'
      AND status IN ('open', 'answered')
    )
  );

-- Users can update their own pending answers
CREATE POLICY "Users can update own pending answers" ON legal_answers
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    moderation_status = 'pending'
  );

-- Experts can update answers for verification
CREATE POLICY "Experts can verify answers" ON legal_answers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM legal_experts 
      WHERE user_id = auth.uid() 
      AND verification_status = 'verified'
      AND is_active = true
    )
  );

-- Moderators and admins can manage all answers
CREATE POLICY "Moderators can manage answers" ON legal_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('moderator', 'admin', 'super_admin')
    )
  );

-- Legal Q&A Votes Policies
-- Users can view votes on approved content
CREATE POLICY "Users can view votes" ON legal_qa_votes
  FOR SELECT USING (
    (question_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM legal_questions 
      WHERE id = legal_qa_votes.question_id 
      AND moderation_status = 'approved'
    )) OR
    (answer_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM legal_answers 
      WHERE id = legal_qa_votes.answer_id 
      AND moderation_status = 'approved'
    ))
  );

-- Users can manage their own votes
CREATE POLICY "Users can manage own votes" ON legal_qa_votes
  FOR ALL USING (auth.uid() = user_id);

-- Legal Experts Policies
-- Public can view verified experts
CREATE POLICY "Public can view verified experts" ON legal_experts
  FOR SELECT USING (
    verification_status = 'verified' AND 
    is_active = true
  );

-- Users can view their own expert profile
CREATE POLICY "Users can view own expert profile" ON legal_experts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own expert profile
CREATE POLICY "Users can create expert profile" ON legal_experts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own expert profile
CREATE POLICY "Users can update own expert profile" ON legal_experts
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can manage expert verification
CREATE POLICY "Admins can manage expert verification" ON legal_experts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Legal Q&A Comments Policies
-- Public can view approved comments on approved content
CREATE POLICY "Public can view approved comments" ON legal_qa_comments
  FOR SELECT USING (
    moderation_status = 'approved' AND
    ((question_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM legal_questions 
      WHERE id = legal_qa_comments.question_id 
      AND moderation_status = 'approved'
    )) OR
    (answer_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM legal_answers 
      WHERE id = legal_qa_comments.answer_id 
      AND moderation_status = 'approved'
    )))
  );

-- Users can view their own comments
CREATE POLICY "Users can view own comments" ON legal_qa_comments
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can create comments
CREATE POLICY "Users can create comments" ON legal_qa_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending comments
CREATE POLICY "Users can update own pending comments" ON legal_qa_comments
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    moderation_status = 'pending'
  );

-- Moderators can manage comments
CREATE POLICY "Moderators can manage comments" ON legal_qa_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('moderator', 'admin', 'super_admin')
    )
  );

-- Legal Q&A Bookmarks Policies
-- Users can manage their own bookmarks
CREATE POLICY "Users can manage own bookmarks" ON legal_qa_bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- Legal Q&A Reports Policies
-- Users can create reports
CREATE POLICY "Users can create reports" ON legal_qa_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON legal_qa_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Moderators can manage all reports
CREATE POLICY "Moderators can manage reports" ON legal_qa_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('moderator', 'admin', 'super_admin')
    )
  );
