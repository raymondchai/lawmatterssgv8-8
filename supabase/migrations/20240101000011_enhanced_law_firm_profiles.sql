-- Enhanced Law Firm Profiles Migration
-- Add new fields to law_firms table for enhanced profiles

-- Add new columns to law_firms table
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS established_year INTEGER;
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS firm_size TEXT CHECK (firm_size IN ('solo', 'small', 'medium', 'large'));
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}';
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS fee_structure TEXT CHECK (fee_structure IN ('hourly', 'fixed', 'contingency', 'mixed'));
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC;
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS accepts_legal_aid BOOLEAN DEFAULT false;
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS office_hours JSONB;
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS social_media JSONB;
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}';
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS awards TEXT[] DEFAULT '{}';
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS response_time TEXT;

-- Create law_firm_team_members table
CREATE TABLE IF NOT EXISTS law_firm_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id UUID REFERENCES law_firms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  email TEXT,
  phone TEXT,
  practice_areas TEXT[] DEFAULT '{}',
  years_experience INTEGER,
  education TEXT[] DEFAULT '{}',
  bar_admissions TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  specializations TEXT[] DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create law_firm_gallery table
CREATE TABLE IF NOT EXISTS law_firm_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id UUID REFERENCES law_firms(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  alt_text TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create law_firm_bookings table
CREATE TABLE IF NOT EXISTS law_firm_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id UUID REFERENCES law_firms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  team_member_id UUID REFERENCES law_firm_team_members(id) ON DELETE SET NULL,
  consultation_type TEXT NOT NULL CHECK (consultation_type IN ('initial', 'follow_up', 'document_review')),
  preferred_date DATE NOT NULL,
  preferred_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  message TEXT,
  contact_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  booking_fee NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_law_firms_firm_size ON law_firms(firm_size);
CREATE INDEX IF NOT EXISTS idx_law_firms_fee_structure ON law_firms(fee_structure);
CREATE INDEX IF NOT EXISTS idx_law_firms_accepts_legal_aid ON law_firms(accepts_legal_aid);
CREATE INDEX IF NOT EXISTS idx_law_firms_established_year ON law_firms(established_year);

CREATE INDEX IF NOT EXISTS idx_law_firm_team_members_law_firm_id ON law_firm_team_members(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_law_firm_team_members_is_active ON law_firm_team_members(is_active);
CREATE INDEX IF NOT EXISTS idx_law_firm_team_members_order_index ON law_firm_team_members(order_index);

CREATE INDEX IF NOT EXISTS idx_law_firm_gallery_law_firm_id ON law_firm_gallery(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_law_firm_gallery_order_index ON law_firm_gallery(order_index);

CREATE INDEX IF NOT EXISTS idx_law_firm_bookings_law_firm_id ON law_firm_bookings(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_law_firm_bookings_user_id ON law_firm_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_law_firm_bookings_status ON law_firm_bookings(status);
CREATE INDEX IF NOT EXISTS idx_law_firm_bookings_preferred_date ON law_firm_bookings(preferred_date);

-- Create triggers for updated_at
CREATE TRIGGER update_law_firm_team_members_updated_at 
  BEFORE UPDATE ON law_firm_team_members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_law_firm_bookings_updated_at 
  BEFORE UPDATE ON law_firm_bookings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update law firm total_reviews count
CREATE OR REPLACE FUNCTION update_law_firm_review_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the law firm's total review count
  UPDATE law_firms 
  SET total_reviews = (
    SELECT COUNT(*)
    FROM law_firm_reviews 
    WHERE law_firm_id = COALESCE(NEW.law_firm_id, OLD.law_firm_id)
    AND status = 'approved'
  )
  WHERE id = COALESCE(NEW.law_firm_id, OLD.law_firm_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create triggers to update law firm review count when reviews change
CREATE TRIGGER update_law_firm_review_count_on_insert
  AFTER INSERT ON law_firm_reviews
  FOR EACH ROW EXECUTE FUNCTION update_law_firm_review_count();

CREATE TRIGGER update_law_firm_review_count_on_update
  AFTER UPDATE ON law_firm_reviews
  FOR EACH ROW EXECUTE FUNCTION update_law_firm_review_count();

CREATE TRIGGER update_law_firm_review_count_on_delete
  AFTER DELETE ON law_firm_reviews
  FOR EACH ROW EXECUTE FUNCTION update_law_firm_review_count();
