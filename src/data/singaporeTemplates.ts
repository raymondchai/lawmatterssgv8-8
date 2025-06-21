import { type Template, type TemplateField } from '@/lib/services/templateMarketplace';

// Common field definitions for reuse
const commonFields = {
  companyName: {
    id: 'company_name',
    name: 'company_name',
    label: 'Company Name',
    type: 'text' as const,
    required: true,
    placeholder: 'Enter company name',
    validation: { minLength: 2, maxLength: 100 }
  },
  employeeName: {
    id: 'employee_name',
    name: 'employee_name',
    label: 'Employee Full Name',
    type: 'text' as const,
    required: true,
    placeholder: 'Enter employee full name',
    validation: { minLength: 2, maxLength: 100 }
  },
  nric: {
    id: 'nric',
    name: 'nric',
    label: 'NRIC/FIN Number',
    type: 'text' as const,
    required: true,
    placeholder: 'S1234567A',
    validation: { pattern: '^[STFG]\\d{7}[A-Z]$' },
    helpText: 'Singapore NRIC or FIN number (e.g., S1234567A)'
  },
  address: {
    id: 'address',
    name: 'address',
    label: 'Address',
    type: 'textarea' as const,
    required: true,
    placeholder: 'Enter full address including postal code',
    validation: { minLength: 10, maxLength: 200 }
  },
  salary: {
    id: 'salary',
    name: 'salary',
    label: 'Monthly Salary (SGD)',
    type: 'number' as const,
    required: true,
    placeholder: '5000',
    validation: { min: 1000, max: 50000 },
    helpText: 'Monthly salary in Singapore Dollars'
  },
  startDate: {
    id: 'start_date',
    name: 'start_date',
    label: 'Start Date',
    type: 'date' as const,
    required: true
  },
  endDate: {
    id: 'end_date',
    name: 'end_date',
    label: 'End Date',
    type: 'date' as const,
    required: false
  }
};

// Singapore-specific legal document templates
export const singaporeTemplates: Partial<Template>[] = [
  // Employment Templates
  {
    title: 'Employment Contract (Full-Time)',
    slug: 'employment-contract-full-time',
    description: 'Comprehensive employment contract for full-time employees in Singapore, compliant with the Employment Act.',
    categoryId: 'employment',
    subcategory: 'contracts',
    accessLevel: 'public',
    priceSgd: 0,
    jurisdiction: 'Singapore',
    legalAreas: ['Employment Law', 'Contract Law'],
    complianceTags: ['Employment Act', 'MOM Guidelines'],
    tags: ['employment', 'contract', 'full-time', 'singapore'],
    fields: [
      commonFields.companyName,
      commonFields.employeeName,
      commonFields.nric,
      commonFields.address,
      {
        id: 'position',
        name: 'position',
        label: 'Job Position',
        type: 'text',
        required: true,
        placeholder: 'Software Engineer'
      },
      commonFields.salary,
      commonFields.startDate,
      {
        id: 'probation_period',
        name: 'probation_period',
        label: 'Probation Period (months)',
        type: 'select',
        required: true,
        options: [
          { label: '3 months', value: '3' },
          { label: '6 months', value: '6' },
          { label: 'No probation', value: '0' }
        ],
        defaultValue: '3'
      },
      {
        id: 'working_hours',
        name: 'working_hours',
        label: 'Working Hours per Week',
        type: 'number',
        required: true,
        defaultValue: 44,
        validation: { min: 35, max: 48 },
        helpText: 'Maximum 48 hours per week as per Employment Act'
      },
      {
        id: 'annual_leave',
        name: 'annual_leave',
        label: 'Annual Leave Days',
        type: 'number',
        required: true,
        defaultValue: 14,
        validation: { min: 7, max: 30 },
        helpText: 'Minimum 7 days for first year of service'
      }
    ] as TemplateField[],
    content: {
      template: `
        <h1>EMPLOYMENT CONTRACT</h1>
        <p>This Employment Contract is made between <strong>{{company_name}}</strong> ("Company") and <strong>{{employee_name}}</strong> ("Employee").</p>
        
        <h2>1. EMPLOYMENT DETAILS</h2>
        <p>Position: {{position}}</p>
        <p>Start Date: {{start_date}}</p>
        <p>Probation Period: {{probation_period}} months</p>
        
        <h2>2. REMUNERATION</h2>
        <p>Monthly Salary: SGD {{salary}}</p>
        
        <h2>3. WORKING HOURS</h2>
        <p>Working Hours: {{working_hours}} hours per week</p>
        <p>Annual Leave: {{annual_leave}} days per year</p>
        
        <h2>4. COMPLIANCE</h2>
        <p>This contract is governed by the Employment Act of Singapore and other applicable laws.</p>
      `
    },
    previewHtml: `
      <div class="document-preview">
        <h1>EMPLOYMENT CONTRACT</h1>
        <p>This Employment Contract is made between <strong>[Company Name]</strong> ("Company") and <strong>[Employee Name]</strong> ("Employee").</p>
        <h2>1. EMPLOYMENT DETAILS</h2>
        <p>Position: [Job Position]</p>
        <p>Start Date: [Start Date]</p>
        <p>Probation Period: [X] months</p>
        <h2>2. REMUNERATION</h2>
        <p>Monthly Salary: SGD [Amount]</p>
        <h2>3. WORKING HOURS</h2>
        <p>Working Hours: [X] hours per week</p>
        <p>Annual Leave: [X] days per year</p>
        <h2>4. COMPLIANCE</h2>
        <p>This contract is governed by the Employment Act of Singapore and other applicable laws.</p>
      </div>
    `,
    isFeatured: true
  },

  {
    title: 'Non-Disclosure Agreement (NDA)',
    slug: 'non-disclosure-agreement',
    description: 'Standard NDA template for protecting confidential information in Singapore business contexts.',
    categoryId: 'business',
    subcategory: 'commercial',
    accessLevel: 'public',
    priceSgd: 0,
    jurisdiction: 'Singapore',
    legalAreas: ['Contract Law', 'Intellectual Property'],
    complianceTags: ['Contract Law', 'Trade Secrets'],
    tags: ['nda', 'confidentiality', 'business', 'singapore'],
    fields: [
      {
        id: 'disclosing_party',
        name: 'disclosing_party',
        label: 'Disclosing Party Name',
        type: 'text',
        required: true,
        placeholder: 'Company or individual sharing information'
      },
      {
        id: 'receiving_party',
        name: 'receiving_party',
        label: 'Receiving Party Name',
        type: 'text',
        required: true,
        placeholder: 'Company or individual receiving information'
      },
      {
        id: 'purpose',
        name: 'purpose',
        label: 'Purpose of Disclosure',
        type: 'textarea',
        required: true,
        placeholder: 'Describe the business purpose for sharing confidential information',
        validation: { minLength: 20, maxLength: 500 }
      },
      {
        id: 'duration',
        name: 'duration',
        label: 'Agreement Duration (years)',
        type: 'select',
        required: true,
        options: [
          { label: '1 year', value: '1' },
          { label: '2 years', value: '2' },
          { label: '3 years', value: '3' },
          { label: '5 years', value: '5' }
        ],
        defaultValue: '2'
      },
      {
        id: 'governing_law',
        name: 'governing_law',
        label: 'Governing Law',
        type: 'select',
        required: true,
        options: [
          { label: 'Singapore Law', value: 'singapore' },
          { label: 'Other (specify in additional terms)', value: 'other' }
        ],
        defaultValue: 'singapore'
      }
    ] as TemplateField[],
    content: {
      template: `
        <h1>NON-DISCLOSURE AGREEMENT</h1>
        <p>This Non-Disclosure Agreement is made between <strong>{{disclosing_party}}</strong> ("Disclosing Party") and <strong>{{receiving_party}}</strong> ("Receiving Party").</p>
        
        <h2>1. PURPOSE</h2>
        <p>{{purpose}}</p>
        
        <h2>2. CONFIDENTIAL INFORMATION</h2>
        <p>All information disclosed by the Disclosing Party shall be considered confidential.</p>
        
        <h2>3. DURATION</h2>
        <p>This agreement shall remain in effect for {{duration}} years from the date of signing.</p>
        
        <h2>4. GOVERNING LAW</h2>
        <p>This agreement is governed by the laws of Singapore.</p>
      `
    },
    isFeatured: true
  },

  {
    title: 'Residential Tenancy Agreement',
    slug: 'residential-tenancy-agreement',
    description: 'Standard residential lease agreement for Singapore properties, compliant with local tenancy laws.',
    categoryId: 'property',
    subcategory: 'rental',
    accessLevel: 'premium',
    priceSgd: 29.90,
    jurisdiction: 'Singapore',
    legalAreas: ['Property Law', 'Tenancy Law'],
    complianceTags: ['Residential Tenancies Act', 'URA Guidelines'],
    tags: ['tenancy', 'rental', 'residential', 'singapore'],
    fields: [
      {
        id: 'landlord_name',
        name: 'landlord_name',
        label: 'Landlord Name',
        type: 'text',
        required: true,
        placeholder: 'Property owner name'
      },
      {
        id: 'tenant_name',
        name: 'tenant_name',
        label: 'Tenant Name',
        type: 'text',
        required: true,
        placeholder: 'Tenant full name'
      },
      {
        id: 'property_address',
        name: 'property_address',
        label: 'Property Address',
        type: 'textarea',
        required: true,
        placeholder: 'Full property address including postal code'
      },
      {
        id: 'monthly_rent',
        name: 'monthly_rent',
        label: 'Monthly Rent (SGD)',
        type: 'number',
        required: true,
        placeholder: '3000',
        validation: { min: 500, max: 20000 }
      },
      {
        id: 'security_deposit',
        name: 'security_deposit',
        label: 'Security Deposit (SGD)',
        type: 'number',
        required: true,
        placeholder: '6000',
        helpText: 'Typically 1-2 months rent'
      },
      {
        id: 'lease_term',
        name: 'lease_term',
        label: 'Lease Term (months)',
        type: 'select',
        required: true,
        options: [
          { label: '6 months', value: '6' },
          { label: '12 months', value: '12' },
          { label: '24 months', value: '24' },
          { label: '36 months', value: '36' }
        ],
        defaultValue: '12'
      },
      commonFields.startDate
    ] as TemplateField[],
    isFeatured: false
  },

  {
    title: 'Simple Will Template',
    slug: 'simple-will-template',
    description: 'Basic will template for Singapore residents to distribute assets and appoint executors.',
    categoryId: 'family',
    subcategory: 'wills',
    accessLevel: 'premium',
    priceSgd: 49.90,
    jurisdiction: 'Singapore',
    legalAreas: ['Estate Planning', 'Family Law'],
    complianceTags: ['Wills Act', 'Probate Rules'],
    tags: ['will', 'estate', 'inheritance', 'singapore'],
    fields: [
      {
        id: 'testator_name',
        name: 'testator_name',
        label: 'Your Full Name',
        type: 'text',
        required: true,
        placeholder: 'Your full legal name'
      },
      commonFields.nric,
      commonFields.address,
      {
        id: 'executor_name',
        name: 'executor_name',
        label: 'Executor Name',
        type: 'text',
        required: true,
        placeholder: 'Person to execute your will'
      },
      {
        id: 'executor_nric',
        name: 'executor_nric',
        label: 'Executor NRIC',
        type: 'text',
        required: true,
        placeholder: 'S1234567A',
        validation: { pattern: '^[STFG]\\d{7}[A-Z]$' }
      },
      {
        id: 'beneficiaries',
        name: 'beneficiaries',
        label: 'Beneficiaries',
        type: 'textarea',
        required: true,
        placeholder: 'List beneficiaries and their inheritance details',
        helpText: 'Describe who will inherit your assets and in what proportions'
      }
    ] as TemplateField[],
    isFeatured: false
  },

  {
    title: 'Business Partnership Agreement',
    slug: 'business-partnership-agreement',
    description: 'Comprehensive partnership agreement for Singapore business partnerships.',
    categoryId: 'business',
    subcategory: 'partnerships',
    accessLevel: 'premium',
    priceSgd: 79.90,
    jurisdiction: 'Singapore',
    legalAreas: ['Business Law', 'Partnership Law'],
    complianceTags: ['Partnership Act', 'ACRA Requirements'],
    tags: ['partnership', 'business', 'agreement', 'singapore'],
    fields: [
      {
        id: 'partnership_name',
        name: 'partnership_name',
        label: 'Partnership Name',
        type: 'text',
        required: true,
        placeholder: 'Business partnership name'
      },
      {
        id: 'partner1_name',
        name: 'partner1_name',
        label: 'Partner 1 Name',
        type: 'text',
        required: true,
        placeholder: 'First partner full name'
      },
      {
        id: 'partner2_name',
        name: 'partner2_name',
        label: 'Partner 2 Name',
        type: 'text',
        required: true,
        placeholder: 'Second partner full name'
      },
      {
        id: 'business_purpose',
        name: 'business_purpose',
        label: 'Business Purpose',
        type: 'textarea',
        required: true,
        placeholder: 'Describe the nature and purpose of the business',
        validation: { minLength: 50, maxLength: 500 }
      },
      {
        id: 'profit_sharing',
        name: 'profit_sharing',
        label: 'Profit Sharing Ratio',
        type: 'text',
        required: true,
        placeholder: '50:50 or other ratio',
        helpText: 'How profits and losses will be shared between partners'
      }
    ] as TemplateField[],
    isFeatured: false
  }
];

// Template categories for Singapore
export const singaporeCategories = [
  {
    name: 'Employment',
    slug: 'employment',
    description: 'Employment contracts, agreements, and HR documents',
    icon: 'briefcase',
    sortOrder: 1,
    isActive: true
  },
  {
    name: 'Business',
    slug: 'business',
    description: 'Business formation, partnerships, and commercial agreements',
    icon: 'building',
    sortOrder: 2,
    isActive: true
  },
  {
    name: 'Property',
    slug: 'property',
    description: 'Real estate, leases, and property-related documents',
    icon: 'home',
    sortOrder: 3,
    isActive: true
  },
  {
    name: 'Family',
    slug: 'family',
    description: 'Family law, wills, and personal legal documents',
    icon: 'users',
    sortOrder: 4,
    isActive: true
  },
  {
    name: 'Intellectual Property',
    slug: 'intellectual-property',
    description: 'Patents, trademarks, and IP protection documents',
    icon: 'lightbulb',
    sortOrder: 5,
    isActive: true
  },
  {
    name: 'Compliance',
    slug: 'compliance',
    description: 'Regulatory compliance and legal compliance documents',
    icon: 'shield',
    sortOrder: 6,
    isActive: true
  }
];

// Function to seed templates into the database
export async function seedSingaporeTemplates() {
  const { supabase } = await import('@/lib/supabase');

  try {
    console.log('Seeding Singapore template categories...');

    // Insert categories first
    const { data: categoryData, error: categoryError } = await supabase
      .from('template_categories')
      .upsert(singaporeCategories, { onConflict: 'slug' })
      .select();

    if (categoryError) {
      throw new Error(`Failed to seed categories: ${categoryError.message}`);
    }

    console.log(`Seeded ${categoryData?.length || 0} categories`);

    // Create category ID mapping
    const categoryMap = new Map();
    categoryData?.forEach(cat => {
      categoryMap.set(cat.slug, cat.id);
    });

    console.log('Seeding Singapore templates...');

    // Prepare templates with category IDs
    const templatesWithCategoryIds = singaporeTemplates.map(template => ({
      ...template,
      category_id: categoryMap.get(template.categoryId),
      access_level: template.accessLevel,
      price_sgd: template.priceSgd,
      legal_areas: template.legalAreas,
      compliance_tags: template.complianceTags,
      is_featured: template.isFeatured,
      is_active: true,
      language: 'en',
      version: 1
    }));

    // Insert templates
    const { data: templateData, error: templateError } = await supabase
      .from('templates')
      .upsert(templatesWithCategoryIds, { onConflict: 'slug' })
      .select();

    if (templateError) {
      throw new Error(`Failed to seed templates: ${templateError.message}`);
    }

    console.log(`Seeded ${templateData?.length || 0} templates`);

    return {
      categories: categoryData?.length || 0,
      templates: templateData?.length || 0
    };

  } catch (error) {
    console.error('Error seeding Singapore templates:', error);
    throw error;
  }
}
