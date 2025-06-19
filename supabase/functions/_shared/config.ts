// Shared configuration for Edge Functions

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

export const OPENAI_CONFIG = {
  apiUrl: 'https://api.openai.com/v1',
  models: {
    embedding: 'text-embedding-ada-002',
    chat: 'gpt-4',
    chatFast: 'gpt-3.5-turbo',
  },
  maxTokens: {
    chat: 1000,
    summary: 500,
    template: 2000,
  },
};

export const USAGE_LIMITS = {
  free: {
    aiChat: { daily: 5, monthly: 50 },
    documentAnalysis: { daily: 2, monthly: 20 },
    templateGeneration: { daily: 1, monthly: 5 },
    documentUpload: { daily: 2, monthly: 20 },
  },
  basic: {
    aiChat: { daily: 25, monthly: 500 },
    documentAnalysis: { daily: 10, monthly: 100 },
    templateGeneration: { daily: 5, monthly: 25 },
    documentUpload: { daily: 10, monthly: 200 },
  },
  premium: {
    aiChat: { daily: 100, monthly: 2000 },
    documentAnalysis: { daily: 50, monthly: 500 },
    templateGeneration: { daily: 20, monthly: 100 },
    documentUpload: { daily: 50, monthly: 1000 },
  },
  enterprise: {
    aiChat: { daily: 1000, monthly: 20000 },
    documentAnalysis: { daily: 200, monthly: 2000 },
    templateGeneration: { daily: 100, monthly: 500 },
    documentUpload: { daily: 200, monthly: 5000 },
  },
};

export const ERROR_MESSAGES = {
  unauthorized: 'Unauthorized access',
  missingFields: 'Missing required fields',
  usageLimitExceeded: 'Usage limit exceeded',
  documentNotFound: 'Document not found',
  openaiNotConfigured: 'OpenAI API key not configured',
  processingFailed: 'Processing failed',
  invalidRequest: 'Invalid request format',
};

export const OPERATION_TYPES = {
  AI_CHAT: 'ai_chat',
  DOCUMENT_ANALYSIS: 'document_analysis',
  TEMPLATE_GENERATION: 'template_generation',
  DOCUMENT_UPLOAD: 'document_upload',
  DOCUMENT_SUMMARIZE: 'document_summarize',
  DOCUMENT_EXTRACT: 'document_extract',
} as const;

export type OperationType = typeof OPERATION_TYPES[keyof typeof OPERATION_TYPES];
export type SubscriptionTier = keyof typeof USAGE_LIMITS;
