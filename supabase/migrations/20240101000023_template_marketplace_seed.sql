-- Migration to seed template marketplace with initial data
-- This populates the template marketplace with Singapore-specific legal document templates

-- Insert template categories
INSERT INTO template_categories (name, slug, description, icon, sort_order, is_active) VALUES
('Employment', 'employment', 'Employment contracts, agreements, and HR documents', 'briefcase', 1, true),
('Business', 'business', 'Business formation, partnerships, and commercial agreements', 'building', 2, true),
('Property', 'property', 'Real estate, leases, and property-related documents', 'home', 3, true),
('Family', 'family', 'Family law, wills, and personal legal documents', 'users', 4, true),
('Intellectual Property', 'intellectual-property', 'Patents, trademarks, and IP protection documents', 'lightbulb', 5, true),
('Compliance', 'compliance', 'Regulatory compliance and legal compliance documents', 'shield', 6, true)
ON CONFLICT (slug) DO NOTHING;

-- Get category IDs for reference
DO $$
DECLARE
    employment_id UUID;
    business_id UUID;
    property_id UUID;
    family_id UUID;
    ip_id UUID;
    compliance_id UUID;
BEGIN
    SELECT id INTO employment_id FROM template_categories WHERE slug = 'employment';
    SELECT id INTO business_id FROM template_categories WHERE slug = 'business';
    SELECT id INTO property_id FROM template_categories WHERE slug = 'property';
    SELECT id INTO family_id FROM template_categories WHERE slug = 'family';
    SELECT id INTO ip_id FROM template_categories WHERE slug = 'intellectual-property';
    SELECT id INTO compliance_id FROM template_categories WHERE slug = 'compliance';

    -- Insert Employment Templates
    INSERT INTO templates (
        title, slug, description, category_id, subcategory, content, fields,
        access_level, price_sgd, jurisdiction, legal_areas, compliance_tags,
        tags, is_featured, is_active, language, version
    ) VALUES
    (
        'Employment Contract (Full-Time)',
        'employment-contract-full-time',
        'Comprehensive employment contract for full-time employees in Singapore, compliant with the Employment Act.',
        employment_id,
        'contracts',
        '{"template": "EMPLOYMENT AGREEMENT\n\nThis Employment Agreement (\"Agreement\") is entered into on {{start_date}} between {{company_name}}, a company incorporated in Singapore (\"Company\") and {{employee_name}}, NRIC {{nric}} (\"Employee\").\n\n1. POSITION AND DUTIES\nThe Employee shall serve as {{position}} and shall perform such duties as may be assigned by the Company.\n\n2. COMPENSATION\nThe Employee shall receive a monthly salary of SGD {{monthly_salary}}, payable monthly in arrears.\n\n3. WORKING HOURS\nNormal working hours are {{working_hours}} per week, Monday to Friday.\n\n4. PROBATIONARY PERIOD\nThe Employee shall be on probation for {{probation_period}} months from the commencement date.\n\n5. TERMINATION\nEither party may terminate this agreement by giving {{notice_period}} notice in writing.\n\nThis agreement is governed by Singapore law.\n\nCompany: {{company_name}}\nEmployee: {{employee_name}}\nDate: {{start_date}}"}',
        '[
            {"id": "company_name", "name": "company_name", "label": "Company Name", "type": "text", "required": true, "placeholder": "Enter company name"},
            {"id": "employee_name", "name": "employee_name", "label": "Employee Name", "type": "text", "required": true, "placeholder": "Enter employee full name"},
            {"id": "nric", "name": "nric", "label": "NRIC/FIN", "type": "text", "required": true, "placeholder": "S1234567A"},
            {"id": "position", "name": "position", "label": "Job Position", "type": "text", "required": true, "placeholder": "Software Engineer"},
            {"id": "monthly_salary", "name": "monthly_salary", "label": "Monthly Salary (SGD)", "type": "number", "required": true, "placeholder": "5000"},
            {"id": "working_hours", "name": "working_hours", "label": "Working Hours per Week", "type": "number", "required": true, "placeholder": "44"},
            {"id": "probation_period", "name": "probation_period", "label": "Probation Period (months)", "type": "number", "required": true, "placeholder": "3"},
            {"id": "notice_period", "name": "notice_period", "label": "Notice Period", "type": "text", "required": true, "placeholder": "1 month"},
            {"id": "start_date", "name": "start_date", "label": "Start Date", "type": "date", "required": true}
        ]',
        'public',
        0,
        'Singapore',
        ARRAY['Employment Law', 'Contract Law'],
        ARRAY['Employment Act', 'MOM Guidelines'],
        ARRAY['employment', 'contract', 'full-time', 'singapore'],
        true,
        true,
        'en',
        1
    ),
    (
        'Non-Disclosure Agreement (NDA)',
        'non-disclosure-agreement',
        'Comprehensive NDA template to protect confidential information in business relationships.',
        business_id,
        'agreements',
        '{"template": "NON-DISCLOSURE AGREEMENT\n\nThis Non-Disclosure Agreement (\"Agreement\") is entered into on {{agreement_date}} between {{disclosing_party}}, a company incorporated in Singapore (\"Disclosing Party\") and {{receiving_party}} (\"Receiving Party\").\n\n1. CONFIDENTIAL INFORMATION\nFor purposes of this Agreement, \"Confidential Information\" means {{confidential_info_definition}}.\n\n2. OBLIGATIONS\nThe Receiving Party agrees to:\na) Keep all Confidential Information strictly confidential\nb) Not disclose Confidential Information to third parties\nc) Use Confidential Information solely for {{purpose}}\n\n3. TERM\nThis Agreement shall remain in effect for {{duration}} from the date of execution.\n\n4. RETURN OF INFORMATION\nUpon termination, all Confidential Information must be returned or destroyed.\n\n5. GOVERNING LAW\nThis Agreement is governed by Singapore law.\n\nDisclosing Party: {{disclosing_party}}\nReceiving Party: {{receiving_party}}\nDate: {{agreement_date}}"}',
        '[
            {"id": "disclosing_party", "name": "disclosing_party", "label": "Disclosing Party", "type": "text", "required": true, "placeholder": "Company name disclosing information"},
            {"id": "receiving_party", "name": "receiving_party", "label": "Receiving Party", "type": "text", "required": true, "placeholder": "Company/person receiving information"},
            {"id": "confidential_info_definition", "name": "confidential_info_definition", "label": "Definition of Confidential Information", "type": "textarea", "required": true, "placeholder": "Describe what constitutes confidential information"},
            {"id": "purpose", "name": "purpose", "label": "Purpose of Disclosure", "type": "textarea", "required": true, "placeholder": "Business evaluation, partnership discussions, etc."},
            {"id": "duration", "name": "duration", "label": "Duration", "type": "text", "required": true, "placeholder": "2 years"},
            {"id": "agreement_date", "name": "agreement_date", "label": "Agreement Date", "type": "date", "required": true}
        ]',
        'public',
        0,
        'Singapore',
        ARRAY['Contract Law', 'Business Law'],
        ARRAY['Contract Law'],
        ARRAY['nda', 'confidentiality', 'business', 'singapore'],
        true,
        true,
        'en',
        1
    ),
    (
        'Tenancy Agreement (Residential)',
        'tenancy-agreement-residential',
        'Standard residential tenancy agreement for Singapore properties.',
        property_id,
        'leases',
        '{"template": "TENANCY AGREEMENT\n\nThis Tenancy Agreement is made on {{agreement_date}} between {{landlord_name}}, NRIC {{landlord_nric}} (\"Landlord\") and {{tenant_name}}, NRIC {{tenant_nric}} (\"Tenant\").\n\n1. PROPERTY\nThe Landlord agrees to let and the Tenant agrees to take the property at {{property_address}} (\"Property\").\n\n2. TERM\nThe tenancy shall be for {{lease_duration}} commencing from {{start_date}}.\n\n3. RENT\nMonthly rent: SGD {{monthly_rent}}\nSecurity deposit: SGD {{security_deposit}}\n\n4. UTILITIES\n{{utilities_clause}}\n\n5. MAINTENANCE\nThe Tenant shall keep the Property in good condition.\n\n6. TERMINATION\nEither party may terminate with {{notice_period}} written notice.\n\nThis agreement is governed by Singapore law.\n\nLandlord: {{landlord_name}}\nTenant: {{tenant_name}}\nDate: {{agreement_date}}"}',
        '[
            {"id": "landlord_name", "name": "landlord_name", "label": "Landlord Name", "type": "text", "required": true},
            {"id": "landlord_nric", "name": "landlord_nric", "label": "Landlord NRIC", "type": "text", "required": true},
            {"id": "tenant_name", "name": "tenant_name", "label": "Tenant Name", "type": "text", "required": true},
            {"id": "tenant_nric", "name": "tenant_nric", "label": "Tenant NRIC", "type": "text", "required": true},
            {"id": "property_address", "name": "property_address", "label": "Property Address", "type": "textarea", "required": true},
            {"id": "lease_duration", "name": "lease_duration", "label": "Lease Duration", "type": "text", "required": true, "placeholder": "12 months"},
            {"id": "monthly_rent", "name": "monthly_rent", "label": "Monthly Rent (SGD)", "type": "number", "required": true},
            {"id": "security_deposit", "name": "security_deposit", "label": "Security Deposit (SGD)", "type": "number", "required": true},
            {"id": "utilities_clause", "name": "utilities_clause", "label": "Utilities Arrangement", "type": "textarea", "required": true, "placeholder": "Tenant to pay all utilities"},
            {"id": "notice_period", "name": "notice_period", "label": "Notice Period", "type": "text", "required": true, "placeholder": "1 month"},
            {"id": "start_date", "name": "start_date", "label": "Start Date", "type": "date", "required": true},
            {"id": "agreement_date", "name": "agreement_date", "label": "Agreement Date", "type": "date", "required": true}
        ]',
        'public',
        0,
        'Singapore',
        ARRAY['Property Law', 'Tenancy Law'],
        ARRAY['Residential Tenancies Act'],
        ARRAY['tenancy', 'rental', 'property', 'singapore'],
        true,
        true,
        'en',
        1
    ),
    (
        'Simple Will Template',
        'simple-will-template',
        'Basic will template for Singapore residents to distribute assets and appoint executors.',
        family_id,
        'wills',
        '{"template": "LAST WILL AND TESTAMENT\n\nI, {{testator_name}}, NRIC {{nric}}, of {{address}}, being of sound mind, do hereby make this my Last Will and Testament.\n\n1. REVOCATION\nI revoke all former wills and codicils made by me.\n\n2. EXECUTOR\nI appoint {{executor_name}} as the executor of this will.\n\n3. BENEFICIARIES\n{{beneficiaries_clause}}\n\n4. RESIDUARY ESTATE\nI give the rest of my estate to {{residuary_beneficiary}}.\n\n5. GUARDIANSHIP\n{{guardianship_clause}}\n\nIN WITNESS WHEREOF, I have signed this will on {{will_date}}.\n\nTestator: {{testator_name}}\nWitness 1: {{witness1_name}}\nWitness 2: {{witness2_name}}\nDate: {{will_date}}"}',
        '[
            {"id": "testator_name", "name": "testator_name", "label": "Your Full Name", "type": "text", "required": true},
            {"id": "nric", "name": "nric", "label": "NRIC", "type": "text", "required": true},
            {"id": "address", "name": "address", "label": "Address", "type": "textarea", "required": true},
            {"id": "executor_name", "name": "executor_name", "label": "Executor Name", "type": "text", "required": true},
            {"id": "beneficiaries_clause", "name": "beneficiaries_clause", "label": "Beneficiaries and Bequests", "type": "textarea", "required": true, "placeholder": "I give my house to my spouse, my savings to my children, etc."},
            {"id": "residuary_beneficiary", "name": "residuary_beneficiary", "label": "Residuary Beneficiary", "type": "text", "required": true},
            {"id": "guardianship_clause", "name": "guardianship_clause", "label": "Guardianship (if applicable)", "type": "textarea", "required": false, "placeholder": "If you have minor children, specify guardianship arrangements"},
            {"id": "witness1_name", "name": "witness1_name", "label": "Witness 1 Name", "type": "text", "required": true},
            {"id": "witness2_name", "name": "witness2_name", "label": "Witness 2 Name", "type": "text", "required": true},
            {"id": "will_date", "name": "will_date", "label": "Will Date", "type": "date", "required": true}
        ]',
        'premium',
        49.90,
        'Singapore',
        ARRAY['Estate Planning', 'Family Law'],
        ARRAY['Wills Act', 'Probate Rules'],
        ARRAY['will', 'estate', 'inheritance', 'singapore'],
        false,
        true,
        'en',
        1
    )
    ON CONFLICT (slug) DO NOTHING;

END $$;

-- Update template download counts and ratings for demo purposes
UPDATE templates SET 
    download_count = FLOOR(RANDOM() * 1000) + 100,
    rating_average = ROUND((RANDOM() * 2 + 3)::numeric, 1),
    rating_count = FLOOR(RANDOM() * 50) + 10
WHERE slug IN ('employment-contract-full-time', 'non-disclosure-agreement', 'tenancy-agreement-residential', 'simple-will-template');

-- Mark some templates as featured
UPDATE templates SET is_featured = true 
WHERE slug IN ('employment-contract-full-time', 'non-disclosure-agreement', 'tenancy-agreement-residential');

COMMENT ON TABLE template_categories IS 'Template categories seeded with Singapore-specific legal document categories';
COMMENT ON TABLE templates IS 'Templates seeded with Singapore-specific legal document templates';
