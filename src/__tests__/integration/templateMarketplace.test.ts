import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import TemplateBrowser from '@/pages/TemplateBrowser';
import TemplatePreview from '@/pages/TemplatePreview';
import TemplateCustomize from '@/pages/TemplateCustomize';
import { templateMarketplaceService } from '@/lib/services/templateMarketplace';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    },
    from: vi.fn(),
    functions: {
      invoke: vi.fn()
    }
  }
}));

// Mock template marketplace service
vi.mock('@/lib/services/templateMarketplace');

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ slug: 'test-template' }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()]
  };
});

const mockTemplate = {
  id: 'template-1',
  title: 'Test Business Agreement',
  slug: 'test-business-agreement',
  description: 'A comprehensive business agreement template for Singapore',
  categoryId: 'business',
  accessLevel: 'public' as const,
  priceSgd: 0,
  downloadCount: 150,
  ratingAverage: 4.5,
  ratingCount: 20,
  isActive: true,
  isFeatured: true,
  tags: ['business', 'agreement', 'singapore'],
  jurisdiction: 'Singapore',
  legalAreas: ['Contract Law', 'Business Law'],
  complianceTags: ['Singapore Companies Act'],
  content: {
    template: 'This agreement is between {{party1_name}} and {{party2_name}} for {{business_purpose}}.'
  },
  fields: [
    {
      id: 'party1_name',
      name: 'party1_name',
      label: 'First Party Name',
      type: 'text' as const,
      required: true,
      placeholder: 'Enter first party name'
    },
    {
      id: 'party2_name',
      name: 'party2_name',
      label: 'Second Party Name',
      type: 'text' as const,
      required: true,
      placeholder: 'Enter second party name'
    },
    {
      id: 'business_purpose',
      name: 'business_purpose',
      label: 'Business Purpose',
      type: 'textarea' as const,
      required: true,
      placeholder: 'Describe the business purpose',
      validation: { minLength: 10, maxLength: 500 }
    }
  ],
  previewHtml: '<p>Preview of the template content...</p>',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  category: {
    id: 'business',
    name: 'Business',
    description: 'Business templates'
  }
};

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User'
  }
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('Template Marketplace Integration Tests', () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    vi.mocked(templateMarketplaceService.searchTemplates).mockResolvedValue({
      templates: [mockTemplate],
      total: 1,
      hasMore: false
    });

    vi.mocked(templateMarketplaceService.getCategories).mockResolvedValue([
      {
        id: 'business',
        name: 'Business',
        description: 'Business templates',
        templateCount: 25,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      }
    ]);

    vi.mocked(templateMarketplaceService.getTemplateBySlug).mockResolvedValue(mockTemplate);
    vi.mocked(templateMarketplaceService.getTemplate).mockResolvedValue(mockTemplate);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Template Discovery and Selection Flow', () => {
    it('should allow user to browse, search, and select a template', async () => {
      render(
        <TestWrapper>
          <TemplateBrowser />
        </TestWrapper>
      );

      // Wait for templates to load
      await waitFor(() => {
        expect(screen.getByText('Test Business Agreement')).toBeInTheDocument();
      });

      // Verify template information is displayed
      expect(screen.getByText('A comprehensive business agreement template for Singapore')).toBeInTheDocument();
      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.getByText('4.5')).toBeInTheDocument();

      // Test search functionality
      const searchInput = screen.getByPlaceholderText(/search templates/i);
      fireEvent.change(searchInput, { target: { value: 'business' } });

      await waitFor(() => {
        expect(templateMarketplaceService.searchTemplates).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'business'
          })
        );
      });

      // Test template selection
      const templateCard = screen.getByText('Test Business Agreement');
      fireEvent.click(templateCard);

      // Verify analytics tracking
      expect(templateMarketplaceService.trackEvent).toHaveBeenCalledWith(
        'template-1',
        'template_view',
        expect.objectContaining({
          source: 'browser',
          category: 'Business',
          access_level: 'public'
        })
      );
    });
  });

  describe('Template Preview Flow', () => {
    it('should display template details and allow customization', async () => {
      render(
        <TestWrapper>
          <TemplatePreview />
        </TestWrapper>
      );

      // Wait for template to load
      await waitFor(() => {
        expect(screen.getByText('Test Business Agreement')).toBeInTheDocument();
      });

      // Verify template details are displayed
      expect(screen.getByText('A comprehensive business agreement template for Singapore')).toBeInTheDocument();
      expect(screen.getByText('Contract Law')).toBeInTheDocument();
      expect(screen.getByText('Singapore Companies Act')).toBeInTheDocument();

      // Verify template fields are shown
      expect(screen.getByText('First Party Name')).toBeInTheDocument();
      expect(screen.getByText('Second Party Name')).toBeInTheDocument();
      expect(screen.getByText('Business Purpose')).toBeInTheDocument();

      // Test customize button
      const customizeButton = screen.getByText(/customize template/i);
      fireEvent.click(customizeButton);

      // Verify analytics tracking for customization start
      expect(templateMarketplaceService.trackEvent).toHaveBeenCalledWith(
        'template-1',
        'customization_started',
        expect.objectContaining({
          source: 'preview_page',
          access_level: 'public'
        })
      );
    });
  });

  describe('Template Customization Flow', () => {
    it('should allow user to customize template fields and generate document', async () => {
      vi.mocked(templateMarketplaceService.createCustomization).mockResolvedValue({
        id: 'custom-1',
        templateId: 'template-1',
        customFields: {},
        userId: 'user-1',
        sessionId: 'session-1',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      render(
        <TestWrapper>
          <TemplateCustomize />
        </TestWrapper>
      );

      // Wait for template to load
      await waitFor(() => {
        expect(screen.getByText('Customize: Test Business Agreement')).toBeInTheDocument();
      });

      // Fill in template fields
      const party1Input = screen.getByLabelText('First Party Name');
      const party2Input = screen.getByLabelText('Second Party Name');
      const purposeTextarea = screen.getByLabelText('Business Purpose');

      fireEvent.change(party1Input, { target: { value: 'ABC Company Pte Ltd' } });
      fireEvent.change(party2Input, { target: { value: 'XYZ Corporation' } });
      fireEvent.change(purposeTextarea, { target: { value: 'Software development services agreement' } });

      // Test form validation
      expect(party1Input).toHaveValue('ABC Company Pte Ltd');
      expect(party2Input).toHaveValue('XYZ Corporation');
      expect(purposeTextarea).toHaveValue('Software development services agreement');

      // Test save functionality
      const saveButton = screen.getByText(/save progress/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(templateMarketplaceService.createCustomization).toHaveBeenCalledWith(
          'template-1',
          expect.objectContaining({
            party1_name: 'ABC Company Pte Ltd',
            party2_name: 'XYZ Corporation',
            business_purpose: 'Software development services agreement'
          }),
          undefined,
          expect.any(String)
        );
      });

      // Test preview functionality
      const previewButton = screen.getByText(/preview/i);
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(templateMarketplaceService.trackEvent).toHaveBeenCalledWith(
          'template-1',
          'preview_generated',
          expect.objectContaining({
            fields_filled: 3
          })
        );
      });
    });

    it('should handle field validation correctly', async () => {
      render(
        <TestWrapper>
          <TemplateCustomize />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Customize: Test Business Agreement')).toBeInTheDocument();
      });

      // Test required field validation
      const saveButton = screen.getByText(/save progress/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/first party name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/second party name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/business purpose is required/i)).toBeInTheDocument();
      });

      // Test field length validation
      const purposeTextarea = screen.getByLabelText('Business Purpose');
      fireEvent.change(purposeTextarea, { target: { value: 'Short' } });

      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/business purpose must be at least 10 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Document Generation Flow', () => {
    it('should generate and download documents in different formats', async () => {
      const mockCustomization = {
        id: 'custom-1',
        templateId: 'template-1',
        customFields: {
          party1_name: 'ABC Company Pte Ltd',
          party2_name: 'XYZ Corporation',
          business_purpose: 'Software development services'
        },
        userId: 'user-1',
        sessionId: 'session-1',
        status: 'completed' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(templateMarketplaceService.createCustomization).mockResolvedValue(mockCustomization);
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          downloadUrl: 'https://example.com/document.pdf',
          fileSize: 1024,
          format: 'pdf'
        },
        error: null
      });

      render(
        <TestWrapper>
          <TemplateCustomize />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Customize: Test Business Agreement')).toBeInTheDocument();
      });

      // Fill in required fields
      const party1Input = screen.getByLabelText('First Party Name');
      const party2Input = screen.getByLabelText('Second Party Name');
      const purposeTextarea = screen.getByLabelText('Business Purpose');

      fireEvent.change(party1Input, { target: { value: 'ABC Company Pte Ltd' } });
      fireEvent.change(party2Input, { target: { value: 'XYZ Corporation' } });
      fireEvent.change(purposeTextarea, { target: { value: 'Software development services agreement' } });

      // Save the customization first
      const saveButton = screen.getByText(/save progress/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(templateMarketplaceService.createCustomization).toHaveBeenCalled();
      });

      // Test PDF download
      const pdfButton = screen.getByText('PDF');
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalledWith(
          'template-document-generator',
          expect.objectContaining({
            body: expect.objectContaining({
              customizationId: 'custom-1',
              format: 'pdf'
            })
          })
        );
      });

      // Verify download tracking
      expect(templateMarketplaceService.recordDownload).toHaveBeenCalledWith(
        'template-1',
        'custom-1',
        'pdf'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle template loading errors gracefully', async () => {
      vi.mocked(templateMarketplaceService.getTemplate).mockRejectedValue(
        new Error('Template not found')
      );

      render(
        <TestWrapper>
          <TemplateCustomize />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/unable to load template/i)).toBeInTheDocument();
        expect(screen.getByText(/template not found/i)).toBeInTheDocument();
      });
    });

    it('should handle document generation errors', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Generation failed' }
      });

      const mockCustomization = {
        id: 'custom-1',
        templateId: 'template-1',
        customFields: { party1_name: 'Test' },
        userId: 'user-1',
        sessionId: 'session-1',
        status: 'completed' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(templateMarketplaceService.createCustomization).mockResolvedValue(mockCustomization);

      render(
        <TestWrapper>
          <TemplateCustomize />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Customize: Test Business Agreement')).toBeInTheDocument();
      });

      // Fill required fields and save
      const party1Input = screen.getByLabelText('First Party Name');
      fireEvent.change(party1Input, { target: { value: 'Test Company' } });

      const saveButton = screen.getByText(/save progress/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(templateMarketplaceService.createCustomization).toHaveBeenCalled();
      });

      // Try to download and expect error
      const pdfButton = screen.getByText('PDF');
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to download document/i)).toBeInTheDocument();
      });
    });
  });

  describe('Analytics Integration', () => {
    it('should track user journey through template marketplace', async () => {
      // Test complete user journey with analytics tracking
      render(
        <TestWrapper>
          <TemplateBrowser />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Business Agreement')).toBeInTheDocument();
      });

      // Track template view
      const templateCard = screen.getByText('Test Business Agreement');
      fireEvent.click(templateCard);

      expect(templateMarketplaceService.trackEvent).toHaveBeenCalledWith(
        'template-1',
        'template_view',
        expect.any(Object)
      );

      // Verify all analytics events are properly structured
      const trackEventCalls = vi.mocked(templateMarketplaceService.trackEvent).mock.calls;
      
      trackEventCalls.forEach(call => {
        expect(call[0]).toBeTruthy(); // template ID
        expect(call[1]).toBeTruthy(); // event type
        expect(typeof call[2]).toBe('object'); // event data
      });
    });
  });
});
