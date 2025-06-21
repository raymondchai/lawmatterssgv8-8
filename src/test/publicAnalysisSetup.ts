import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
vi.mock('@/lib/config/constants', () => ({
  ROUTES: {
    home: '/',
    publicAnalysis: '/analyze',
    publicAnalysisResult: '/analyze/result',
    pricing: '/pricing',
    register: '/auth/register',
  },
  PUBLIC_ANALYSIS_CONFIG: {
    rateLimits: {
      documentsPerHour: 3,
      documentsPerDay: 10,
      maxFileSize: 10 * 1024 * 1024,
      allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      sessionDuration: 60 * 60 * 1000,
    },
    features: {
      basicOCR: true,
      textExtraction: true,
      documentSummary: true,
      keywordExtraction: true,
      documentClassification: false,
      legalInsights: false,
      entityExtraction: false,
      complianceCheck: false,
    },
    storage: {
      bucket: 'public-documents',
      retentionHours: 24,
      maxStoragePerSession: 50 * 1024 * 1024,
    },
    conversionPrompts: {
      showAfterAnalysis: true,
      showAdvancedFeatures: true,
      highlightPremiumBenefits: true,
    },
  },
}));

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://example.com/signed-url' },
          error: null,
        }),
      })),
    },
  },
}));

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-123'),
  },
});

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'test-user-agent',
    language: 'en-US',
  },
});

// Mock screen
Object.defineProperty(global, 'screen', {
  value: {
    width: 1920,
    height: 1080,
  },
});

// Mock Intl
Object.defineProperty(global, 'Intl', {
  value: {
    DateTimeFormat: vi.fn(() => ({
      resolvedOptions: () => ({ timeZone: 'UTC' }),
    })),
  },
});

// Mock window and document
Object.defineProperty(global, 'window', {
  value: {
    location: { href: 'http://localhost:3000/analyze' },
    addEventListener: vi.fn(),
  },
});

Object.defineProperty(global, 'document', {
  value: {
    referrer: 'http://google.com',
    addEventListener: vi.fn(),
    visibilityState: 'visible',
  },
});

// Mock fetch for IP detection
global.fetch = vi.fn().mockResolvedValue({
  json: () => Promise.resolve({ ip: '127.0.0.1' }),
  ok: true,
  status: 200,
});

// Mock FileReader
global.FileReader = class FileReader {
  result: string | ArrayBuffer | null = null;
  error: DOMException | null = null;
  readyState: number = 0;
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;

  readAsDataURL(file: Blob): void {
    setTimeout(() => {
      this.result = 'data:application/pdf;base64,dGVzdCBjb250ZW50';
      this.readyState = 2;
      if (this.onload) {
        this.onload({} as ProgressEvent<FileReader>);
      }
    }, 0);
  }

  readAsText(file: Blob): void {
    setTimeout(() => {
      this.result = 'test content';
      this.readyState = 2;
      if (this.onload) {
        this.onload({} as ProgressEvent<FileReader>);
      }
    }, 0);
  }

  abort(): void {
    this.readyState = 2;
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean { return true; }

  static readonly EMPTY = 0;
  static readonly LOADING = 1;
  static readonly DONE = 2;
};

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost:3000/test');
global.URL.revokeObjectURL = vi.fn();

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Suppress console warnings in tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
