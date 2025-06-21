-- RLS Policies for Enhanced Law Firm Features

-- Enable RLS on new tables
ALTER TABLE law_firm_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_firm_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_firm_bookings ENABLE ROW LEVEL SECURITY;

-- Law Firm Team Members Policies
-- Public can view active team members of verified law firms
CREATE POLICY "Public can view active team members" ON law_firm_team_members
  FOR SELECT USING (
    is_active = true AND 
    EXISTS (
      SELECT 1 FROM law_firms 
      WHERE id = law_firm_team_members.law_firm_id 
      AND verified = true
    )
  );

-- Law firm owners and admins can manage team members
CREATE POLICY "Law firm owners can manage team members" ON law_firm_team_members
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM law_firm_owners WHERE law_firm_id = law_firm_team_members.law_firm_id
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Law Firm Gallery Policies
-- Public can view gallery images of verified law firms
CREATE POLICY "Public can view law firm gallery" ON law_firm_gallery
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM law_firms 
      WHERE id = law_firm_gallery.law_firm_id 
      AND verified = true
    )
  );

-- Law firm owners and admins can manage gallery
CREATE POLICY "Law firm owners can manage gallery" ON law_firm_gallery
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM law_firm_owners WHERE law_firm_id = law_firm_gallery.law_firm_id
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Law Firm Bookings Policies
-- Users can view their own bookings
CREATE POLICY "Users can view own bookings" ON law_firm_bookings
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create bookings for verified law firms
CREATE POLICY "Users can create bookings" ON law_firm_bookings
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM law_firms 
      WHERE id = law_firm_bookings.law_firm_id 
      AND verified = true
    )
  );

-- Users can update their own pending bookings
CREATE POLICY "Users can update own pending bookings" ON law_firm_bookings
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    status = 'pending'
  );

-- Law firm owners can view and manage their bookings
CREATE POLICY "Law firm owners can manage bookings" ON law_firm_bookings
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM law_firm_owners WHERE law_firm_id = law_firm_bookings.law_firm_id
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create law_firm_owners table if it doesn't exist (for ownership management)
CREATE TABLE IF NOT EXISTS law_firm_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id UUID REFERENCES law_firms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'editor')),
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(law_firm_id, user_id)
);

-- Enable RLS on law_firm_owners
ALTER TABLE law_firm_owners ENABLE ROW LEVEL SECURITY;

-- Law firm owners can view their own ownership records
CREATE POLICY "Users can view own law firm ownership" ON law_firm_owners
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can manage law firm ownership
CREATE POLICY "Admins can manage law firm ownership" ON law_firm_owners
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create indexes for law_firm_owners
CREATE INDEX IF NOT EXISTS idx_law_firm_owners_law_firm_id ON law_firm_owners(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_law_firm_owners_user_id ON law_firm_owners(user_id);

-- Create trigger for law_firm_owners updated_at
CREATE TRIGGER update_law_firm_owners_updated_at 
  BEFORE UPDATE ON law_firm_owners 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
