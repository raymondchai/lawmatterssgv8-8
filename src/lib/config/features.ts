// Feature flags to control heavy features and prevent memory issues
export interface FeatureFlags {
  // PDF Processing Features
  enablePdfAnnotations: boolean;
  enablePdfOcr: boolean;
  enablePdfAnalysis: boolean;
  
  // Document Processing Features
  enableDocumentUpload: boolean;
  enableDocumentAnalysis: boolean;
  enableRealTimeCollaboration: boolean;
  
  // AI Features
  enableAiDocumentGeneration: boolean;
  enableAiLegalAdvice: boolean;
  enableAiDocumentReview: boolean;
  
  // Performance Features
  enableLazyLoading: boolean;
  enableWebWorkers: boolean;
  enableMemoryOptimization: boolean;
  
  // Development Features
  enableDebugMode: boolean;
  enablePerformanceMonitoring: boolean;
}

// Default feature flags - conservative settings for stability
const defaultFeatures: FeatureFlags = {
  // PDF Processing - Disabled temporarily to fix memory issues
  enablePdfAnnotations: false,
  enablePdfOcr: false,
  enablePdfAnalysis: false,
  
  // Document Processing - Basic features only
  enableDocumentUpload: true,
  enableDocumentAnalysis: false,
  enableRealTimeCollaboration: false,
  
  // AI Features - Disabled temporarily
  enableAiDocumentGeneration: false,
  enableAiLegalAdvice: false,
  enableAiDocumentReview: false,
  
  // Performance Features - Enabled for optimization
  enableLazyLoading: true,
  enableWebWorkers: true,
  enableMemoryOptimization: true,
  
  // Development Features
  enableDebugMode: process.env.NODE_ENV === 'development',
  enablePerformanceMonitoring: true,
};

// Environment-based overrides
const getEnvironmentOverrides = (): Partial<FeatureFlags> => {
  const env = process.env.NODE_ENV;
  
  switch (env) {
    case 'development':
      return {
        enableDebugMode: true,
        enablePerformanceMonitoring: true,
        // Enable features gradually in development
        enablePdfAnnotations: process.env.VITE_ENABLE_PDF_FEATURES === 'true',
        enablePdfOcr: process.env.VITE_ENABLE_OCR === 'true',
      };
      
    case 'production':
      return {
        enableDebugMode: false,
        enablePerformanceMonitoring: true,
        // Only enable stable features in production
        enableDocumentUpload: true,
        enableLazyLoading: true,
      };
      
    default:
      return {};
  }
};

// Merge default features with environment overrides
const environmentOverrides = getEnvironmentOverrides();
export const featureFlags: FeatureFlags = {
  ...defaultFeatures,
  ...environmentOverrides,
};

// Feature flag checker functions
export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  return featureFlags[feature];
};

export const enableFeature = (feature: keyof FeatureFlags): void => {
  featureFlags[feature] = true;
  console.log(`Feature enabled: ${feature}`);
};

export const disableFeature = (feature: keyof FeatureFlags): void => {
  featureFlags[feature] = false;
  console.log(`Feature disabled: ${feature}`);
};

// Batch feature control
export const enableFeatures = (features: (keyof FeatureFlags)[]): void => {
  features.forEach(feature => enableFeature(feature));
};

export const disableFeatures = (features: (keyof FeatureFlags)[]): void => {
  features.forEach(feature => disableFeature(feature));
};

// Performance monitoring
export const getEnabledFeatures = (): string[] => {
  return Object.entries(featureFlags)
    .filter(([_, enabled]) => enabled)
    .map(([feature, _]) => feature);
};

export const getDisabledFeatures = (): string[] => {
  return Object.entries(featureFlags)
    .filter(([_, enabled]) => !enabled)
    .map(([feature, _]) => feature);
};

// Memory optimization helpers
export const shouldLoadHeavyFeatures = (): boolean => {
  // Check available memory and performance
  if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
    const deviceMemory = (navigator as any).deviceMemory;
    return deviceMemory >= 4; // Only load heavy features on devices with 4GB+ RAM
  }
  
  // Fallback: check if performance API is available
  if (typeof performance !== 'undefined' && performance.memory) {
    const usedMemory = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
    return usedMemory < 100; // Only load if using less than 100MB
  }
  
  return false; // Conservative default
};

// Auto-adjust features based on performance
export const autoAdjustFeatures = (): void => {
  if (!shouldLoadHeavyFeatures()) {
    console.warn('Device memory low, disabling heavy features');
    disableFeatures([
      'enablePdfOcr',
      'enablePdfAnalysis',
      'enableAiDocumentGeneration',
      'enableRealTimeCollaboration'
    ]);
  }
};
