import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PublicAnalysis from '@/pages/PublicAnalysis';
import { usePublicDocumentAnalysis } from '@/hooks/usePublicDocumentAnalysis';

// Mock the hook
vi.mock('@/hooks/usePublicDocumentAnalysis');

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock analytics service
vi.mock('@/lib/services/publicAnalytics', () => ({
  publicAnalyticsService: {
    trackInteraction: vi.fn(),
    trackPageView: vi.fn(),
    initializeSession: vi.fn(),
  }
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('PublicAnalysis Component', () => {
  const mockAnalyzeDocument = vi.fn();
  const mockAnalysisState = {
    isAnalyzing: false,
    progress: 0,
    error: null,
    currentAnalysis: null,
  };
  const mockRateLimitStatus = {
    allowed: true,
    remaining: { hourly: 3, daily: 10 },
    resetTime: { 
      hourly: new Date(), 
      daily: new Date() 
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (usePublicDocumentAnalysis as any).mockReturnValue({
      analysisState: mockAnalysisState,
      rateLimitStatus: mockRateLimitStatus,
      analyzeDocument: mockAnalyzeDocument,
    });
  });

  it('renders the main heading and description', () => {
    renderWithProviders(<PublicAnalysis />);
    
    expect(screen.getByText('Free Document Analysis')).toBeInTheDocument();
    expect(screen.getByText(/Upload your legal documents and get instant analysis/)).toBeInTheDocument();
  });

  it('displays upload component when not analyzing', () => {
    renderWithProviders(<PublicAnalysis />);
    
    expect(screen.getByText('Upload Document')).toBeInTheDocument();
    expect(screen.getByText(/Upload a PDF or image file/)).toBeInTheDocument();
  });

  it('shows rate limit information when available', () => {
    renderWithProviders(<PublicAnalysis />);
    
    expect(screen.getByText('Usage Remaining:')).toBeInTheDocument();
    expect(screen.getByText('This hour: 3 documents')).toBeInTheDocument();
    expect(screen.getByText('Today: 10 documents')).toBeInTheDocument();
  });

  it('displays error message when analysis fails', () => {
    const errorState = {
      ...mockAnalysisState,
      error: 'Analysis failed. Please try again.',
    };

    (usePublicDocumentAnalysis as any).mockReturnValue({
      analysisState: errorState,
      rateLimitStatus: mockRateLimitStatus,
      analyzeDocument: mockAnalyzeDocument,
    });

    renderWithProviders(<PublicAnalysis />);
    
    expect(screen.getByText('Analysis failed. Please try again.')).toBeInTheDocument();
  });

  it('shows progress bar when analyzing', () => {
    const analyzingState = {
      ...mockAnalysisState,
      isAnalyzing: true,
      progress: 50,
    };

    (usePublicDocumentAnalysis as any).mockReturnValue({
      analysisState: analyzingState,
      rateLimitStatus: mockRateLimitStatus,
      analyzeDocument: mockAnalyzeDocument,
    });

    renderWithProviders(<PublicAnalysis />);
    
    expect(screen.getByText('Analyzing document...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('displays rate limit exceeded message', () => {
    const rateLimitExceeded = {
      allowed: false,
      remaining: { hourly: 0, daily: 5 },
      resetTime: { hourly: new Date(), daily: new Date() },
      message: 'Hourly limit exceeded. Please try again in an hour.',
    };

    (usePublicDocumentAnalysis as any).mockReturnValue({
      analysisState: mockAnalysisState,
      rateLimitStatus: rateLimitExceeded,
      analyzeDocument: mockAnalyzeDocument,
    });

    renderWithProviders(<PublicAnalysis />);
    
    expect(screen.getByText('Hourly limit exceeded. Please try again in an hour.')).toBeInTheDocument();
    expect(screen.getByText('Remaining today: 5 documents')).toBeInTheDocument();
  });

  it('navigates to pricing when View Pricing Plans is clicked', async () => {
    renderWithProviders(<PublicAnalysis />);
    
    const pricingButton = screen.getByText('View Pricing Plans');
    fireEvent.click(pricingButton);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/pricing');
    });
  });

  it('navigates to registration when Create Free Account is clicked', async () => {
    renderWithProviders(<PublicAnalysis />);
    
    const registerButton = screen.getByText('Create Free Account');
    fireEvent.click(registerButton);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth/register');
    });
  });

  it('disables upload when rate limit exceeded', () => {
    const rateLimitExceeded = {
      allowed: false,
      remaining: { hourly: 0, daily: 0 },
      resetTime: { hourly: new Date(), daily: new Date() },
      message: 'Daily limit exceeded',
    };

    (usePublicDocumentAnalysis as any).mockReturnValue({
      analysisState: mockAnalysisState,
      rateLimitStatus: rateLimitExceeded,
      analyzeDocument: mockAnalyzeDocument,
    });

    renderWithProviders(<PublicAnalysis />);
    
    // The upload component should be disabled
    const uploadArea = screen.getByText(/Upload a PDF or image file/).closest('div');
    expect(uploadArea).toHaveClass('opacity-50');
  });

  it('disables upload when analyzing', () => {
    const analyzingState = {
      ...mockAnalysisState,
      isAnalyzing: true,
    };

    (usePublicDocumentAnalysis as any).mockReturnValue({
      analysisState: analyzingState,
      rateLimitStatus: mockRateLimitStatus,
      analyzeDocument: mockAnalyzeDocument,
    });

    renderWithProviders(<PublicAnalysis />);
    
    // The upload component should be disabled during analysis
    const uploadArea = screen.getByText(/Upload a PDF or image file/).closest('div');
    expect(uploadArea).toHaveClass('opacity-50');
  });

  it('displays feature cards correctly', () => {
    renderWithProviders(<PublicAnalysis />);
    
    expect(screen.getByText('Text Extraction')).toBeInTheDocument();
    expect(screen.getByText('Quick Analysis')).toBeInTheDocument();
    expect(screen.getByText('Secure & Private')).toBeInTheDocument();
    expect(screen.getByText('No Registration')).toBeInTheDocument();
  });

  it('shows premium features in upgrade section', () => {
    renderWithProviders(<PublicAnalysis />);
    
    expect(screen.getByText('Unlock Advanced Features')).toBeInTheDocument();
    expect(screen.getByText('Advanced legal insights and compliance checks')).toBeInTheDocument();
    expect(screen.getByText('Entity extraction and risk assessment')).toBeInTheDocument();
  });

  it('displays file requirements correctly', () => {
    renderWithProviders(<PublicAnalysis />);
    
    expect(screen.getByText('File Requirements')).toBeInTheDocument();
    expect(screen.getByText('Supported Formats')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('JPEG')).toBeInTheDocument();
    expect(screen.getByText('PNG')).toBeInTheDocument();
    expect(screen.getByText('WebP')).toBeInTheDocument();
    expect(screen.getByText('Maximum 10MB per file')).toBeInTheDocument();
  });
});
