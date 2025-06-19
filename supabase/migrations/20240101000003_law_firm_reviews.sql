-- Create law_firm_reviews table
CREATE TABLE law_firm_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id UUID REFERENCES law_firms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  helpful_count INTEGER DEFAULT 0,
  verified_client BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(law_firm_id, user_id) -- One review per user per law firm
);

-- Create law_firm_review_votes table for helpful votes
CREATE TABLE law_firm_review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES law_firm_reviews(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id) -- One vote per user per review
);

-- Create indexes for better performance
CREATE INDEX idx_law_firm_reviews_law_firm_id ON law_firm_reviews(law_firm_id);
CREATE INDEX idx_law_firm_reviews_user_id ON law_firm_reviews(user_id);
CREATE INDEX idx_law_firm_reviews_status ON law_firm_reviews(status);
CREATE INDEX idx_law_firm_reviews_rating ON law_firm_reviews(rating);
CREATE INDEX idx_law_firm_review_votes_review_id ON law_firm_review_votes(review_id);
CREATE INDEX idx_law_firm_review_votes_user_id ON law_firm_review_votes(user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_law_firm_reviews_updated_at 
  BEFORE UPDATE ON law_firm_reviews 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update law firm average rating
CREATE OR REPLACE FUNCTION update_law_firm_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the law firm's average rating
  UPDATE law_firms 
  SET rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM law_firm_reviews 
    WHERE law_firm_id = COALESCE(NEW.law_firm_id, OLD.law_firm_id)
    AND status = 'approved'
  )
  WHERE id = COALESCE(NEW.law_firm_id, OLD.law_firm_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create triggers to update law firm rating when reviews change
CREATE TRIGGER update_law_firm_rating_on_insert
  AFTER INSERT ON law_firm_reviews
  FOR EACH ROW EXECUTE FUNCTION update_law_firm_rating();

CREATE TRIGGER update_law_firm_rating_on_update
  AFTER UPDATE ON law_firm_reviews
  FOR EACH ROW EXECUTE FUNCTION update_law_firm_rating();

CREATE TRIGGER update_law_firm_rating_on_delete
  AFTER DELETE ON law_firm_reviews
  FOR EACH ROW EXECUTE FUNCTION update_law_firm_rating();

-- Function to update review helpful count
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the review's helpful count
  UPDATE law_firm_reviews 
  SET helpful_count = (
    SELECT COUNT(*)
    FROM law_firm_review_votes 
    WHERE review_id = COALESCE(NEW.review_id, OLD.review_id)
    AND is_helpful = true
  )
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create triggers to update helpful count when votes change
CREATE TRIGGER update_review_helpful_count_on_insert
  AFTER INSERT ON law_firm_review_votes
  FOR EACH ROW EXECUTE FUNCTION update_review_helpful_count();

CREATE TRIGGER update_review_helpful_count_on_update
  AFTER UPDATE ON law_firm_review_votes
  FOR EACH ROW EXECUTE FUNCTION update_review_helpful_count();

CREATE TRIGGER update_review_helpful_count_on_delete
  AFTER DELETE ON law_firm_review_votes
  FOR EACH ROW EXECUTE FUNCTION update_review_helpful_count();
