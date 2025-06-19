import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock UI components for testing
const MockToaster = () => <div data-testid="toaster" />;
const MockSonner = () => <div data-testid="sonner" />;

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            {children}
            <MockToaster />
            <MockSonner />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Mock data generators
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  subscription_tier: 'free' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockDocument = {
  id: 'test-doc-id',
  user_id: 'test-user-id',
  filename: 'test-document.pdf',
  file_url: 'https://example.com/test-document.pdf',
  file_size: 1024000,
  document_type: 'contract',
  processing_status: 'completed' as const,
  ocr_text: 'This is extracted text from the document',
  ocr_quality_score: 0.95,
  document_structure: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockTemplate = {
  id: 'test-template-id',
  name: 'Test Template',
  description: 'A test template for testing',
  category: 'Contracts',
  content: 'Template content here',
  variables: ['party1', 'party2', 'date'],
  is_public: true,
  created_by: 'test-user-id',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockLawFirm = {
  id: 'test-firm-id',
  name: 'Test Law Firm',
  description: 'A test law firm',
  address: '123 Test Street, Singapore',
  phone: '+65 1234 5678',
  email: 'contact@testfirm.com',
  website: 'https://testfirm.com',
  practice_areas: ['Corporate Law', 'Contract Law'],
  rating: 4.5,
  verified: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Test utilities
export const createMockFile = (
  name = 'test.pdf',
  size = 1024,
  type = 'application/pdf'
): File => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

export const createMockFileList = (files: File[]): FileList => {
  const fileList = {
    length: files.length,
    item: (index: number) => files[index] || null,
    [Symbol.iterator]: function* () {
      for (let i = 0; i < files.length; i++) {
        yield files[i];
      }
    },
  };
  
  // Add files as indexed properties
  files.forEach((file, index) => {
    (fileList as any)[index] = file;
  });
  
  return fileList as FileList;
};

// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      getPublicUrl: vi.fn(() => ({
        data: { publicUrl: 'https://example.com/file.pdf' },
      })),
      remove: vi.fn(),
    })),
  },
  rpc: vi.fn(),
};

// Wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Custom matchers
export const toBeInTheDocument = (element: HTMLElement | null) => {
  return element !== null && document.body.contains(element);
};

// Mock intersection observer entry
export const createMockIntersectionObserverEntry = (
  target: Element,
  isIntersecting = true
): IntersectionObserverEntry => ({
  target,
  isIntersecting,
  intersectionRatio: isIntersecting ? 1 : 0,
  intersectionRect: isIntersecting ? target.getBoundingClientRect() : new DOMRect(),
  boundingClientRect: target.getBoundingClientRect(),
  rootBounds: new DOMRect(),
  time: Date.now(),
});

// Test data factories
export const createTestUser = (overrides = {}) => ({
  ...mockUser,
  ...overrides,
});

export const createTestDocument = (overrides = {}) => ({
  ...mockDocument,
  ...overrides,
});

export const createTestTemplate = (overrides = {}) => ({
  ...mockTemplate,
  ...overrides,
});

export const createTestLawFirm = (overrides = {}) => ({
  ...mockLawFirm,
  ...overrides,
});
