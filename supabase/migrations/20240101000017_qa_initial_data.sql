-- Initial Data for Legal Q&A System
-- Insert default categories and sample data

-- Insert main legal categories
INSERT INTO legal_qa_categories (name, description, icon, color, order_index) VALUES
('Employment Law', 'Questions about workplace rights, contracts, and employment disputes', '💼', '#3B82F6', 1),
('Property Law', 'Real estate transactions, landlord-tenant issues, and property disputes', '🏠', '#10B981', 2),
('Corporate Law', 'Business formation, contracts, and corporate governance', '🏢', '#8B5CF6', 3),
('Family Law', 'Divorce, custody, adoption, and family-related legal matters', '👨‍👩‍👧‍👦', '#F59E0B', 4),
('Criminal Law', 'Criminal charges, defense, and legal procedures', '⚖️', '#EF4444', 5),
('Immigration Law', 'Visa applications, work permits, and citizenship matters', '🌍', '#06B6D4', 6),
('Intellectual Property', 'Patents, trademarks, copyrights, and IP protection', '💡', '#EC4899', 7),
('Tax Law', 'Tax obligations, disputes, and compliance matters', '💰', '#84CC16', 8),
('Contract Law', 'Contract disputes, drafting, and interpretation', '📄', '#6366F1', 9),
('Personal Injury', 'Accident claims, medical malpractice, and compensation', '🏥', '#F97316', 10),
('Consumer Protection', 'Consumer rights, warranties, and product liability', '🛡️', '#14B8A6', 11),
('Banking & Finance', 'Loans, mortgages, and financial regulations', '🏦', '#A855F7', 12);

-- Insert subcategories for Employment Law
INSERT INTO legal_qa_categories (name, description, icon, color, parent_id, order_index) 
SELECT 
  subcategory.name,
  subcategory.description,
  subcategory.icon,
  '#3B82F6',
  main.id,
  subcategory.order_index
FROM legal_qa_categories main,
(VALUES 
  ('Wrongful Termination', 'Unfair dismissal and termination disputes', '🚫', 1),
  ('Workplace Harassment', 'Sexual harassment and workplace discrimination', '⚠️', 2),
  ('Employment Contracts', 'Contract terms, non-compete clauses, and negotiations', '📋', 3),
  ('Work Permits', 'Foreign worker permits and employment pass issues', '📝', 4),
  ('Salary & Benefits', 'Wage disputes, overtime, and employee benefits', '💵', 5)
) AS subcategory(name, description, icon, order_index)
WHERE main.name = 'Employment Law';

-- Insert subcategories for Property Law
INSERT INTO legal_qa_categories (name, description, icon, color, parent_id, order_index) 
SELECT 
  subcategory.name,
  subcategory.description,
  subcategory.icon,
  '#10B981',
  main.id,
  subcategory.order_index
FROM legal_qa_categories main,
(VALUES 
  ('Rental Disputes', 'Landlord-tenant conflicts and rental agreements', '🏠', 1),
  ('Property Purchase', 'Buying and selling property, conveyancing', '🔑', 2),
  ('HDB Matters', 'HDB regulations, resale, and eligibility', '🏘️', 3),
  ('Property Development', 'Development projects and planning permissions', '🏗️', 4),
  ('Strata Management', 'Condominium management and by-laws', '🏢', 5)
) AS subcategory(name, description, icon, order_index)
WHERE main.name = 'Property Law';

-- Insert subcategories for Family Law
INSERT INTO legal_qa_categories (name, description, icon, color, parent_id, order_index) 
SELECT 
  subcategory.name,
  subcategory.description,
  subcategory.icon,
  '#F59E0B',
  main.id,
  subcategory.order_index
FROM legal_qa_categories main,
(VALUES 
  ('Divorce Proceedings', 'Divorce procedures, grounds, and settlements', '💔', 1),
  ('Child Custody', 'Custody arrangements and child support', '👶', 2),
  ('Adoption', 'Adoption procedures and requirements', '🤱', 3),
  ('Matrimonial Assets', 'Division of assets and financial settlements', '💰', 4),
  ('Domestic Violence', 'Protection orders and domestic abuse cases', '🛡️', 5)
) AS subcategory(name, description, icon, order_index)
WHERE main.name = 'Family Law';

-- Insert subcategories for Corporate Law
INSERT INTO legal_qa_categories (name, description, icon, color, parent_id, order_index) 
SELECT 
  subcategory.name,
  subcategory.description,
  subcategory.icon,
  '#8B5CF6',
  main.id,
  subcategory.order_index
FROM legal_qa_categories main,
(VALUES 
  ('Company Formation', 'Incorporating companies and business registration', '🏗️', 1),
  ('Corporate Governance', 'Board duties, compliance, and regulations', '📊', 2),
  ('Mergers & Acquisitions', 'M&A transactions and due diligence', '🤝', 3),
  ('Commercial Contracts', 'Business agreements and contract disputes', '📄', 4),
  ('Regulatory Compliance', 'Industry regulations and compliance matters', '✅', 5)
) AS subcategory(name, description, icon, order_index)
WHERE main.name = 'Corporate Law';

-- Insert subcategories for Criminal Law
INSERT INTO legal_qa_categories (name, description, icon, color, parent_id, order_index) 
SELECT 
  subcategory.name,
  subcategory.description,
  subcategory.icon,
  '#EF4444',
  main.id,
  subcategory.order_index
FROM legal_qa_categories main,
(VALUES 
  ('Criminal Defense', 'Defense strategies and criminal proceedings', '🛡️', 1),
  ('White Collar Crime', 'Financial crimes and corporate offenses', '💼', 2),
  ('Traffic Offenses', 'Traffic violations and driving-related charges', '🚗', 3),
  ('Drug Offenses', 'Drug-related charges and penalties', '💊', 4),
  ('Cybercrime', 'Internet crimes and digital security offenses', '💻', 5)
) AS subcategory(name, description, icon, order_index)
WHERE main.name = 'Criminal Law';

-- Create some sample questions (for demonstration)
-- Note: These would typically be created by users, but we'll add a few examples

-- Sample question 1
INSERT INTO legal_questions (
  user_id, 
  category_id, 
  title, 
  content, 
  tags, 
  urgency_level, 
  location, 
  is_anonymous, 
  status, 
  moderation_status,
  featured
) 
SELECT 
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  (SELECT id FROM legal_qa_categories WHERE name = 'Employment Law' LIMIT 1),
  'What are my rights if I''m terminated without notice?',
  'I was working for a company for 2 years and they suddenly terminated me without any notice period. They said it was due to restructuring but I suspect it might be because I raised concerns about workplace safety. What are my rights under Singapore employment law? Can I claim compensation for the lack of notice period?',
  ARRAY['termination', 'notice period', 'employment rights', 'compensation'],
  'high',
  'Singapore',
  false,
  'open',
  'approved',
  true
WHERE EXISTS (SELECT 1 FROM profiles WHERE role = 'admin');

-- Sample question 2
INSERT INTO legal_questions (
  user_id, 
  category_id, 
  title, 
  content, 
  tags, 
  urgency_level, 
  location, 
  is_anonymous, 
  status, 
  moderation_status,
  featured
) 
SELECT 
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  (SELECT id FROM legal_qa_categories WHERE name = 'Property Law' LIMIT 1),
  'Can my landlord increase rent during the lease period?',
  'I signed a 2-year lease agreement with my landlord 6 months ago. Now they want to increase the rent by 20% citing inflation and market rates. The lease agreement doesn''t mention anything about rent increases during the lease period. Is this legal? What can I do to protect myself?',
  ARRAY['rental', 'lease agreement', 'rent increase', 'tenant rights'],
  'normal',
  'Singapore',
  false,
  'open',
  'approved',
  true
WHERE EXISTS (SELECT 1 FROM profiles WHERE role = 'admin');

-- Sample question 3
INSERT INTO legal_questions (
  user_id, 
  category_id, 
  title, 
  content, 
  tags, 
  urgency_level, 
  location, 
  is_anonymous, 
  status, 
  moderation_status
) 
SELECT 
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  (SELECT id FROM legal_qa_categories WHERE name = 'Corporate Law' LIMIT 1),
  'What are the requirements for incorporating a private limited company?',
  'I want to start a tech startup in Singapore and I''m considering incorporating as a private limited company. What are the minimum requirements in terms of shareholders, directors, and capital? Are there any restrictions on foreign ownership? What documents do I need to prepare?',
  ARRAY['incorporation', 'private limited company', 'startup', 'foreign ownership'],
  'normal',
  'Singapore',
  false,
  'open',
  'approved'
WHERE EXISTS (SELECT 1 FROM profiles WHERE role = 'admin');
