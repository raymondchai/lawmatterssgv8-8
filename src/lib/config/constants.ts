// Application constants and configuration
import { config } from './env';

export const APP_CONFIG = {
  name: config.app.name,
  version: '8.0.0',
  description: 'AI-powered legal document management platform for Singapore',
  url: {
    production: 'https://lawmatterssgv8.com',
    staging: 'https://staging.lawmatterssgv8.com',
    development: config.app.url
  }
};

export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    period: 'forever',
    limits: {
      dailyAiRequests: 10,
      monthlyAiRequests: 10,
      dailyDocumentUploads: 1,
      monthlyDocumentUploads: 1,
      customDocumentDownloads: 0,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxDocuments: 50
    },
    features: [
      'Law firm directory access (basic)',
      '10 AI queries per month',
      '1 document download per month',
      'Save bookmarks',
      'Premium contract templates',
      'Document analysis with AI',
      'Priority support'
    ]
  },
  premium: {
    name: 'Premium',
    price: 19,
    period: 'month',
    popular: true,
    limits: {
      dailyAiRequests: 50,
      monthlyAiRequests: 50,
      dailyDocumentUploads: 10,
      monthlyDocumentUploads: 10,
      customDocumentDownloads: 3,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxDocuments: 500
    },
    features: [
      'All features from Free plan',
      '50 AI queries per month',
      '10 document downloads per month',
      'Access to all premium templates',
      'Advanced document analysis with AI',
      'Priority dashboard and analytics',
      'Priority support'
    ]
  },
  pro: {
    name: 'Pro',
    price: 159,
    period: 'month',
    limits: {
      dailyAiRequests: 500,
      monthlyAiRequests: 500,
      dailyDocumentUploads: 50,
      monthlyDocumentUploads: 20,
      customDocumentDownloads: 20,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxDocuments: 2000
    },
    features: [
      'Everything in Premium plan',
      '500 AI queries per month',
      '20 customized legal document downloads',
      'Unlimited AI queries',
      'Unlimited document downloads',
      'Custom document templates',
      'API access for integrations',
      'Dedicated account manager'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    price: null, // Custom pricing
    period: 'custom',
    limits: {
      dailyAiRequests: -1, // Unlimited
      monthlyAiRequests: -1, // Unlimited
      dailyDocumentUploads: -1, // Unlimited
      monthlyDocumentUploads: -1, // Unlimited
      customDocumentDownloads: -1, // Unlimited
      maxFileSize: 500 * 1024 * 1024, // 500MB
      maxDocuments: -1 // Unlimited
    },
    features: [
      'All features from Premium plan',
      'Unlimited AI queries',
      'Unlimited document downloads',
      'Custom document templates',
      'API access for integrations',
      'Document extraction and bulk uploads',
      'Dedicated account manager'
    ]
  }
} as const;

export const DOCUMENT_TYPES = {
  contract: 'Contract',
  legal_brief: 'Legal Brief',
  court_filing: 'Court Filing',
  agreement: 'Agreement',
  other: 'Other'
} as const;

export const PROCESSING_STATUS = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed'
} as const;

export const TEMPLATE_CATEGORIES = [
  'Contracts',
  'Agreements',
  'Legal Briefs',
  'Court Filings',
  'Corporate Documents',
  'Real Estate',
  'Employment',
  'Intellectual Property',
  'Family Law',
  'Other'
] as const;

export const PRACTICE_AREAS = [
  'Corporate Law',
  'Criminal Law',
  'Family Law',
  'Real Estate Law',
  'Employment Law',
  'Intellectual Property',
  'Immigration Law',
  'Tax Law',
  'Banking & Finance',
  'Litigation',
  'Arbitration',
  'Regulatory Compliance'
] as const;

export const FILE_UPLOAD = {
  maxSize: {
    free: 10 * 1024 * 1024, // 10MB
    premium: 50 * 1024 * 1024, // 50MB
    pro: 100 * 1024 * 1024, // 100MB
    enterprise: 500 * 1024 * 1024 // 500MB
  },
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ],
  allowedExtensions: config.fileUpload.allowedFileTypes.map(type => `.${type}`)
} as const;

export const AI_OPERATIONS = {
  chat: 'chat',
  summarize: 'summarize',
  extractEntities: 'extract-entities',
  generateTemplate: 'generate-template'
} as const;

// Stripe subscription price IDs (to be updated with actual Stripe price IDs)
export const STRIPE_PRICE_IDS = {
  premium: {
    monthly: 'price_premium_monthly', // Replace with actual Stripe price ID
    yearly: 'price_premium_yearly'    // Replace with actual Stripe price ID
  },
  pro: {
    monthly: 'price_pro_monthly',     // Replace with actual Stripe price ID
    yearly: 'price_pro_yearly'       // Replace with actual Stripe price ID
  }
} as const;

export const ROUTES = {
  home: '/',
  login: '/auth/login',
  register: '/auth/register',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  dashboard: '/dashboard',
  documents: '/dashboard/documents',
  templates: '/dashboard/templates',
  aiChat: '/dashboard/ai-chat',
  profile: '/dashboard/profile',
  subscription: '/dashboard/subscription',
  security: '/dashboard/security',
  lawFirms: '/law-firms',
  pricing: '/pricing',
  subscribe: '/subscribe',
  paymentSuccess: '/payment/success',
  paymentFailure: '/payment/failure',
  admin: '/admin',
  adminUsers: '/admin/users',
  adminAnalytics: '/admin/analytics',
  // Public Document Analysis Routes
  publicAnalysis: '/analyze',
  publicAnalysisResult: '/analyze/result',
  // Template Marketplace Routes
  templateMarketplace: '/templates',
  templateBrowser: '/templates/browse',
  templatePreview: '/templates/preview',
  templateCustomize: '/templates/customize',
  templateGenerate: '/templates/generate',
  templateDownload: '/templates/download'
} as const;

// Public Document Analysis Configuration
export const PUBLIC_ANALYSIS_CONFIG = {
  // Rate limiting for public users
  rateLimits: {
    documentsPerHour: 3,
    documentsPerDay: 10,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    sessionDuration: 60 * 60 * 1000, // 1 hour in milliseconds
  },

  // Analysis features available to public users
  features: {
    basicOCR: true,
    textExtraction: true,
    documentSummary: true,
    keywordExtraction: true,
    documentClassification: false, // Premium feature
    legalInsights: false, // Premium feature
    entityExtraction: false, // Premium feature
    complianceCheck: false, // Premium feature
  },

  // Storage configuration for public documents
  storage: {
    bucket: 'public-documents',
    retentionHours: 24, // Auto-delete after 24 hours
    maxStoragePerSession: 50 * 1024 * 1024, // 50MB per session
  },

  // Conversion prompts
  conversionPrompts: {
    showAfterAnalysis: true,
    showAdvancedFeatures: true,
    highlightPremiumBenefits: true,
  }
} as const;

// Template Marketplace Configuration
export const TEMPLATE_MARKETPLACE_CONFIG = {
  // Template categories
  categories: [
    {
      id: 'employment',
      name: 'Employment',
      description: 'Employment contracts, agreements, and HR documents',
      icon: 'briefcase',
      subcategories: ['contracts', 'policies', 'termination', 'benefits']
    },
    {
      id: 'business',
      name: 'Business',
      description: 'Business formation, partnerships, and commercial agreements',
      icon: 'building',
      subcategories: ['incorporation', 'partnerships', 'commercial', 'licensing']
    },
    {
      id: 'property',
      name: 'Property',
      description: 'Real estate, leases, and property-related documents',
      icon: 'home',
      subcategories: ['purchase', 'lease', 'rental', 'development']
    },
    {
      id: 'family',
      name: 'Family',
      description: 'Family law, wills, and personal legal documents',
      icon: 'users',
      subcategories: ['wills', 'divorce', 'custody', 'adoption']
    },
    {
      id: 'intellectual-property',
      name: 'Intellectual Property',
      description: 'Patents, trademarks, and IP protection documents',
      icon: 'lightbulb',
      subcategories: ['patents', 'trademarks', 'copyright', 'licensing']
    },
    {
      id: 'compliance',
      name: 'Compliance',
      description: 'Regulatory compliance and legal compliance documents',
      icon: 'shield',
      subcategories: ['gdpr', 'financial', 'healthcare', 'environmental']
    }
  ],

  // Template access levels
  accessLevels: {
    public: {
      name: 'Public',
      description: 'Free templates available to all users',
      features: ['basic_customization', 'pdf_download', 'preview'],
      limitations: ['watermark', 'basic_fields_only']
    },
    premium: {
      name: 'Premium',
      description: 'Advanced templates for premium subscribers',
      features: ['advanced_customization', 'multiple_formats', 'legal_review', 'version_history'],
      limitations: []
    },
    enterprise: {
      name: 'Enterprise',
      description: 'Custom templates for enterprise clients',
      features: ['custom_branding', 'api_access', 'bulk_generation', 'priority_support'],
      limitations: []
    }
  },

  // Template generation settings
  generation: {
    maxCustomFields: 50,
    supportedFormats: ['pdf', 'docx', 'html'],
    aiModels: ['gpt-4', 'claude-3'],
    maxGenerationTime: 30000, // 30 seconds
    retryAttempts: 3
  },

  // Singapore-specific settings
  singapore: {
    jurisdiction: 'Singapore',
    language: 'English',
    currency: 'SGD',
    legalSystem: 'Common Law',
    regulatoryBodies: [
      'ACRA', 'MAS', 'MOM', 'URA', 'IRAS', 'AGC'
    ],
    complianceStandards: [
      'Companies Act',
      'Employment Act',
      'Personal Data Protection Act',
      'Securities and Futures Act'
    ]
  },

  // Template validation rules
  validation: {
    requiredFields: ['title', 'description', 'category', 'jurisdiction'],
    maxTitleLength: 100,
    maxDescriptionLength: 500,
    minPreviewLength: 100,
    allowedFileTypes: ['pdf', 'docx', 'txt'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
  },

  // Pricing configuration
  pricing: {
    free: {
      templatesPerMonth: 3,
      customizationLevel: 'basic',
      downloadFormats: ['pdf'],
      support: 'community'
    },
    premium: {
      templatesPerMonth: 50,
      customizationLevel: 'advanced',
      downloadFormats: ['pdf', 'docx', 'html'],
      support: 'email'
    },
    enterprise: {
      templatesPerMonth: 'unlimited',
      customizationLevel: 'full',
      downloadFormats: ['pdf', 'docx', 'html', 'xml'],
      support: 'priority'
    }
  }
} as const;
