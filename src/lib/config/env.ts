/**
 * Environment configuration utility
 * Provides type-safe access to environment variables with validation
 */

export interface AppConfig {
  // Supabase
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };
  
  // OpenAI
  openai: {
    apiKey?: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  
  // Stripe
  stripe: {
    publishableKey?: string;
    secretKey?: string;
    webhookSecret?: string;
  };
  
  // Email
  email: {
    sendgridApiKey?: string;
    resendApiKey?: string;
    fromEmail: string;
  };
  
  // Application
  app: {
    name: string;
    url: string;
    apiUrl: string;
    environment: 'development' | 'staging' | 'production';
  };
  
  // Analytics
  analytics: {
    posthogKey?: string;
    posthogHost?: string;
    sentryDsn?: string;
  };
  
  // File Upload
  fileUpload: {
    maxFileSizeMB: number;
    maxFileSizePremiumMB: number;
    allowedFileTypes: string[];
  };
  
  // Rate Limiting
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  
  // Feature Flags
  features: {
    aiChat: boolean;
    documentAnalysis: boolean;
    templateGeneration: boolean;
    lawFirmDirectory: boolean;
  };
  
  // Debug
  debug: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * Get environment variable with optional default value
 */
function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value ?? defaultValue ?? '';
}

/**
 * Get boolean environment variable
 */
function getBooleanEnvVar(key: string, defaultValue: boolean = false): boolean {
  const value = getEnvVar(key, defaultValue.toString());
  return value.toLowerCase() === 'true';
}

/**
 * Get number environment variable
 */
function getNumberEnvVar(key: string, defaultValue: number): number {
  const value = getEnvVar(key, defaultValue.toString());
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
}

/**
 * Get array environment variable (comma-separated)
 */
function getArrayEnvVar(key: string, defaultValue: string[] = []): string[] {
  const value = getEnvVar(key, defaultValue.join(','));
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

/**
 * Application configuration
 */
export const config: AppConfig = {
  supabase: {
    url: getEnvVar('VITE_SUPABASE_URL', 'https://placeholder.supabase.co'),
    anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY', 'placeholder-key'),
    serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY', ''),
  },
  
  openai: {
    apiKey: getEnvVar('OPENAI_API_KEY', ''),
    model: getEnvVar('OPENAI_MODEL', 'gpt-4-turbo'),
    maxTokens: getNumberEnvVar('OPENAI_MAX_TOKENS', 4000),
    temperature: getNumberEnvVar('OPENAI_TEMPERATURE', 0.1),
  },
  
  stripe: {
    publishableKey: getEnvVar('VITE_STRIPE_PUBLISHABLE_KEY', ''),
    secretKey: getEnvVar('STRIPE_SECRET_KEY', ''),
    webhookSecret: getEnvVar('STRIPE_WEBHOOK_SECRET', ''),
  },
  
  email: {
    sendgridApiKey: getEnvVar('SENDGRID_API_KEY', ''),
    resendApiKey: getEnvVar('RESEND_API_KEY', ''),
    fromEmail: getEnvVar('SENDGRID_FROM_EMAIL', 'noreply@lawmatterssg.com'),
  },
  
  app: {
    name: getEnvVar('VITE_APP_NAME', 'LawMattersSG'),
    url: getEnvVar('VITE_APP_URL', 'http://localhost:8082'),
    apiUrl: getEnvVar('VITE_API_URL', 'http://localhost:8082/api'),
    environment: getEnvVar('VITE_ENVIRONMENT', 'development') as 'development' | 'staging' | 'production',
  },
  
  analytics: {
    posthogKey: getEnvVar('VITE_POSTHOG_KEY', ''),
    posthogHost: getEnvVar('VITE_POSTHOG_HOST', 'https://app.posthog.com'),
    sentryDsn: getEnvVar('SENTRY_DSN', ''),
  },
  
  fileUpload: {
    maxFileSizeMB: getNumberEnvVar('VITE_MAX_FILE_SIZE_MB', 10),
    maxFileSizePremiumMB: getNumberEnvVar('VITE_MAX_FILE_SIZE_PREMIUM_MB', 50),
    allowedFileTypes: getArrayEnvVar('VITE_ALLOWED_FILE_TYPES', ['pdf', 'doc', 'docx', 'txt']),
  },
  
  rateLimit: {
    requestsPerMinute: getNumberEnvVar('VITE_RATE_LIMIT_REQUESTS_PER_MINUTE', 60),
    requestsPerHour: getNumberEnvVar('VITE_RATE_LIMIT_REQUESTS_PER_HOUR', 1000),
  },
  
  features: {
    aiChat: getBooleanEnvVar('VITE_ENABLE_AI_CHAT', true),
    documentAnalysis: getBooleanEnvVar('VITE_ENABLE_DOCUMENT_ANALYSIS', true),
    templateGeneration: getBooleanEnvVar('VITE_ENABLE_TEMPLATE_GENERATION', false),
    lawFirmDirectory: getBooleanEnvVar('VITE_ENABLE_LAW_FIRM_DIRECTORY', false),
  },
  
  debug: {
    enabled: getBooleanEnvVar('VITE_DEBUG_MODE', false),
    logLevel: getEnvVar('VITE_LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error',
  },
};

/**
 * Validate required environment variables
 */
export function validateConfig(): void {
  // Skip validation in development mode for now
  const isDev = import.meta.env.VITE_ENVIRONMENT === 'development' || import.meta.env.DEV;
  if (isDev) {
    console.log('Development mode: Skipping environment validation');
    return;
  }

  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ];

  const missingVars = requiredVars.filter(varName => {
    const value = import.meta.env[varName];
    return !value || value.trim() === '';
  });

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
}

/**
 * Check if we're in development mode
 */
export const isDevelopment = config.app.environment === 'development';

/**
 * Check if we're in production mode
 */
export const isProduction = config.app.environment === 'production';

/**
 * Check if we're in staging mode
 */
export const isStaging = config.app.environment === 'staging';

// Validate configuration on import
validateConfig();
