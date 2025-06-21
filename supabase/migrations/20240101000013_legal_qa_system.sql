-- Legal Q&A System Database Schema
-- Create tables for questions, answers, categories, and expert verification

-- Legal Q&A Categories
CREATE TABLE IF NOT EXISTS legal_qa_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  parent_id UUID REFERENCES legal_qa_categories(id) ON DELETE SET NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legal Questions
CREATE TABLE IF NOT EXISTS legal_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES legal_qa_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  urgency_level TEXT DEFAULT 'normal' CHECK (urgency_level IN ('low', 'normal', 'high', 'urgent')),
  location TEXT, -- Singapore location context
  is_anonymous BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed', 'flagged')),
  view_count INTEGER DEFAULT 0,
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  answer_count INTEGER DEFAULT 0,
  has_expert_answer BOOLEAN DEFAULT false,
  has_ai_answer BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  moderated_at TIMESTAMPTZ,
  moderation_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legal Answers
CREATE TABLE IF NOT EXISTS legal_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES legal_questions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  answer_type TEXT DEFAULT 'community' CHECK (answer_type IN ('community', 'expert', 'ai', 'verified')),
  is_accepted BOOLEAN DEFAULT false,
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  expert_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  sources TEXT[], -- Legal sources and references
  disclaimer TEXT,
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Q&A Votes (for questions and answers)
CREATE TABLE IF NOT EXISTS legal_qa_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES legal_questions(id) ON DELETE CASCADE,
  answer_id UUID REFERENCES legal_answers(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote', 'helpful')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id, vote_type),
  UNIQUE(user_id, answer_id, vote_type),
  CHECK ((question_id IS NOT NULL AND answer_id IS NULL) OR (question_id IS NULL AND answer_id IS NOT NULL))
);

-- Expert Profiles (extends profiles for legal experts)
CREATE TABLE IF NOT EXISTS legal_experts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  law_firm_id UUID REFERENCES law_firms(id) ON DELETE SET NULL,
  bar_number TEXT,
  specializations TEXT[] DEFAULT '{}',
  years_experience INTEGER,
  education TEXT[],
  certifications TEXT[],
  languages TEXT[] DEFAULT '{}',
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
  verification_documents TEXT[], -- URLs to verification documents
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  bio TEXT,
  expertise_score INTEGER DEFAULT 0,
  answer_count INTEGER DEFAULT 0,
  helpful_answer_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Q&A Comments (for additional discussion)
CREATE TABLE IF NOT EXISTS legal_qa_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES legal_questions(id) ON DELETE CASCADE,
  answer_id UUID REFERENCES legal_answers(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES legal_qa_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  upvote_count INTEGER DEFAULT 0,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK ((question_id IS NOT NULL AND answer_id IS NULL) OR (question_id IS NULL AND answer_id IS NOT NULL))
);

-- Q&A Bookmarks/Favorites
CREATE TABLE IF NOT EXISTS legal_qa_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES legal_questions(id) ON DELETE CASCADE,
  answer_id UUID REFERENCES legal_answers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id),
  UNIQUE(user_id, answer_id),
  CHECK ((question_id IS NOT NULL AND answer_id IS NULL) OR (question_id IS NULL AND answer_id IS NOT NULL))
);

-- Q&A Reports (for moderation)
CREATE TABLE IF NOT EXISTS legal_qa_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES legal_questions(id) ON DELETE CASCADE,
  answer_id UUID REFERENCES legal_answers(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES legal_qa_comments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'misinformation', 'harassment', 'copyright', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK ((question_id IS NOT NULL AND answer_id IS NULL AND comment_id IS NULL) OR 
         (question_id IS NULL AND answer_id IS NOT NULL AND comment_id IS NULL) OR
         (question_id IS NULL AND answer_id IS NULL AND comment_id IS NOT NULL))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_legal_qa_categories_parent_id ON legal_qa_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_legal_qa_categories_active ON legal_qa_categories(is_active);

CREATE INDEX IF NOT EXISTS idx_legal_questions_user_id ON legal_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_questions_category_id ON legal_questions(category_id);
CREATE INDEX IF NOT EXISTS idx_legal_questions_status ON legal_questions(status);
CREATE INDEX IF NOT EXISTS idx_legal_questions_moderation_status ON legal_questions(moderation_status);
CREATE INDEX IF NOT EXISTS idx_legal_questions_created_at ON legal_questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_questions_featured ON legal_questions(featured);
CREATE INDEX IF NOT EXISTS idx_legal_questions_tags ON legal_questions USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_legal_answers_question_id ON legal_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_legal_answers_user_id ON legal_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_answers_type ON legal_answers(answer_type);
CREATE INDEX IF NOT EXISTS idx_legal_answers_accepted ON legal_answers(is_accepted);
CREATE INDEX IF NOT EXISTS idx_legal_answers_expert_verified ON legal_answers(expert_verified);
CREATE INDEX IF NOT EXISTS idx_legal_answers_moderation_status ON legal_answers(moderation_status);

CREATE INDEX IF NOT EXISTS idx_legal_qa_votes_user_id ON legal_qa_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_qa_votes_question_id ON legal_qa_votes(question_id);
CREATE INDEX IF NOT EXISTS idx_legal_qa_votes_answer_id ON legal_qa_votes(answer_id);

CREATE INDEX IF NOT EXISTS idx_legal_experts_user_id ON legal_experts(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_experts_verification_status ON legal_experts(verification_status);
CREATE INDEX IF NOT EXISTS idx_legal_experts_specializations ON legal_experts USING GIN(specializations);

CREATE INDEX IF NOT EXISTS idx_legal_qa_comments_question_id ON legal_qa_comments(question_id);
CREATE INDEX IF NOT EXISTS idx_legal_qa_comments_answer_id ON legal_qa_comments(answer_id);
CREATE INDEX IF NOT EXISTS idx_legal_qa_comments_parent_id ON legal_qa_comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_legal_qa_bookmarks_user_id ON legal_qa_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_qa_reports_status ON legal_qa_reports(status);

-- Create triggers for updated_at columns
CREATE TRIGGER update_legal_qa_categories_updated_at
  BEFORE UPDATE ON legal_qa_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_legal_questions_updated_at
  BEFORE UPDATE ON legal_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_legal_answers_updated_at
  BEFORE UPDATE ON legal_answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_legal_experts_updated_at
  BEFORE UPDATE ON legal_experts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_legal_qa_comments_updated_at
  BEFORE UPDATE ON legal_qa_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update question statistics
CREATE OR REPLACE FUNCTION update_question_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update answer count
  UPDATE legal_questions
  SET answer_count = (
    SELECT COUNT(*)
    FROM legal_answers
    WHERE question_id = COALESCE(NEW.question_id, OLD.question_id)
    AND moderation_status = 'approved'
  ),
  has_expert_answer = (
    SELECT EXISTS(
      SELECT 1 FROM legal_answers
      WHERE question_id = COALESCE(NEW.question_id, OLD.question_id)
      AND answer_type IN ('expert', 'verified')
      AND moderation_status = 'approved'
    )
  ),
  has_ai_answer = (
    SELECT EXISTS(
      SELECT 1 FROM legal_answers
      WHERE question_id = COALESCE(NEW.question_id, OLD.question_id)
      AND answer_type = 'ai'
      AND moderation_status = 'approved'
    )
  ),
  status = CASE
    WHEN (SELECT COUNT(*) FROM legal_answers
          WHERE question_id = COALESCE(NEW.question_id, OLD.question_id)
          AND moderation_status = 'approved') > 0
    THEN 'answered'
    ELSE status
  END
  WHERE id = COALESCE(NEW.question_id, OLD.question_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create triggers to update question statistics
CREATE TRIGGER update_question_stats_on_answer_insert
  AFTER INSERT ON legal_answers
  FOR EACH ROW EXECUTE FUNCTION update_question_stats();

CREATE TRIGGER update_question_stats_on_answer_update
  AFTER UPDATE ON legal_answers
  FOR EACH ROW EXECUTE FUNCTION update_question_stats();

CREATE TRIGGER update_question_stats_on_answer_delete
  AFTER DELETE ON legal_answers
  FOR EACH ROW EXECUTE FUNCTION update_question_stats();

-- Function to update vote counts
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update question vote counts
  IF NEW.question_id IS NOT NULL OR OLD.question_id IS NOT NULL THEN
    UPDATE legal_questions
    SET upvote_count = (
      SELECT COUNT(*) FROM legal_qa_votes
      WHERE question_id = COALESCE(NEW.question_id, OLD.question_id)
      AND vote_type = 'upvote'
    ),
    downvote_count = (
      SELECT COUNT(*) FROM legal_qa_votes
      WHERE question_id = COALESCE(NEW.question_id, OLD.question_id)
      AND vote_type = 'downvote'
    )
    WHERE id = COALESCE(NEW.question_id, OLD.question_id);
  END IF;

  -- Update answer vote counts
  IF NEW.answer_id IS NOT NULL OR OLD.answer_id IS NOT NULL THEN
    UPDATE legal_answers
    SET upvote_count = (
      SELECT COUNT(*) FROM legal_qa_votes
      WHERE answer_id = COALESCE(NEW.answer_id, OLD.answer_id)
      AND vote_type = 'upvote'
    ),
    downvote_count = (
      SELECT COUNT(*) FROM legal_qa_votes
      WHERE answer_id = COALESCE(NEW.answer_id, OLD.answer_id)
      AND vote_type = 'downvote'
    ),
    helpful_count = (
      SELECT COUNT(*) FROM legal_qa_votes
      WHERE answer_id = COALESCE(NEW.answer_id, OLD.answer_id)
      AND vote_type = 'helpful'
    )
    WHERE id = COALESCE(NEW.answer_id, OLD.answer_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create triggers to update vote counts
CREATE TRIGGER update_vote_counts_on_insert
  AFTER INSERT ON legal_qa_votes
  FOR EACH ROW EXECUTE FUNCTION update_vote_counts();

CREATE TRIGGER update_vote_counts_on_delete
  AFTER DELETE ON legal_qa_votes
  FOR EACH ROW EXECUTE FUNCTION update_vote_counts();

-- Function to update expert statistics
CREATE OR REPLACE FUNCTION update_expert_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update expert answer statistics
  UPDATE legal_experts
  SET answer_count = (
    SELECT COUNT(*)
    FROM legal_answers
    WHERE user_id = (SELECT user_id FROM legal_experts WHERE user_id = COALESCE(NEW.user_id, OLD.user_id))
    AND moderation_status = 'approved'
  ),
  helpful_answer_count = (
    SELECT COUNT(*)
    FROM legal_answers
    WHERE user_id = (SELECT user_id FROM legal_experts WHERE user_id = COALESCE(NEW.user_id, OLD.user_id))
    AND helpful_count > 0
    AND moderation_status = 'approved'
  )
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create triggers to update expert statistics
CREATE TRIGGER update_expert_stats_on_answer_change
  AFTER INSERT OR UPDATE OR DELETE ON legal_answers
  FOR EACH ROW EXECUTE FUNCTION update_expert_stats();
