// Application constants and configuration

export const APP_CONFIG = {
  name: 'LawMattersSG',
  version: '8.0.0',
  description: 'AI-powered legal document management platform for Singapore',
  url: {
    production: 'https://lawmatterssgv8.com',
    staging: 'https://staging.lawmatterssgv8.com',
    development: 'http://localhost:8080'
  }
};

export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    limits: {
      dailyAiRequests: 5,
      monthlyAiRequests: 50,
      dailyDocumentUploads: 2,
      monthlyDocumentUploads: 20,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxDocuments: 50
    },
    features: [
      'Basic document upload',
      'Limited AI assistance',
      'Public templates access',
      'Basic search'
    ]
  },
  basic: {
    name: 'Basic',
    price: 29,
    limits: {
      dailyAiRequests: 25,
      monthlyAiRequests: 500,
      dailyDocumentUploads: 10,
      monthlyDocumentUploads: 200,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxDocuments: 500
    },
    features: [
      'Enhanced document processing',
      'Advanced AI assistance',
      'Custom templates',
      'Priority support',
      'Advanced search'
    ]
  },
  premium: {
    name: 'Premium',
    price: 99,
    limits: {
      dailyAiRequests: 100,
      monthlyAiRequests: 2000,
      dailyDocumentUploads: 50,
      monthlyDocumentUploads: 1000,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxDocuments: 2000
    },
    features: [
      'Unlimited document processing',
      'Premium AI features',
      'Template marketplace',
      'API access',
      'Advanced analytics',
      'Priority support'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    price: 299,
    limits: {
      dailyAiRequests: 1000,
      monthlyAiRequests: 20000,
      dailyDocumentUploads: 200,
      monthlyDocumentUploads: 5000,
      maxFileSize: 500 * 1024 * 1024, // 500MB
      maxDocuments: 10000
    },
    features: [
      'Unlimited everything',
      'Custom AI training',
      'White-label solution',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee'
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
    basic: 50 * 1024 * 1024, // 50MB
    premium: 100 * 1024 * 1024, // 100MB
    enterprise: 500 * 1024 * 1024 // 500MB
  },
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ],
  allowedExtensions: ['.pdf', '.doc', '.docx', '.txt']
} as const;

export const AI_OPERATIONS = {
  chat: 'chat',
  summarize: 'summarize',
  extractEntities: 'extract-entities',
  generateTemplate: 'generate-template'
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
  lawFirms: '/law-firms',
  pricing: '/pricing',
  admin: '/admin',
  adminUsers: '/admin/users',
  adminAnalytics: '/admin/analytics'
} as const;
