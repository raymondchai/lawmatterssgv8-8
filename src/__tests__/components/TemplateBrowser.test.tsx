import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TemplateBrowser from '@/pages/TemplateBrowser';
import { templateMarketplaceService } from '@/lib/services/templateMarketplace';

// Mock the template marketplace service
vi.mock('@/lib/services/templateMarketplace', () => ({
  templateMarketplaceService: {
    searchTemplates: vi.fn(),
    getCategories: vi.fn(),
    trackEvent: vi.fn()
  }
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()]
  };
});

const mockTemplates = [
  {
    id: 'template-1',
    title: 'Business Agreement Template',
    slug: 'business-agreement-template',
    description: 'A comprehensive business agreement template',
    categoryId: 'business',
    accessLevel: 'public' as const,
    priceSgd: 0,
    downloadCount: 150,
    ratingAverage: 4.5,
    ratingCount: 20,
    isActive: true,
    isFeatured: true,
    tags: ['business', 'agreement'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    category: {
      id: 'business',
      name: 'Business',
      description: 'Business templates'
    }
  },
  {
    id: 'template-2',
    title: 'Employment Contract',
    slug: 'employment-contract',
    description: 'Standard employment contract template',
    categoryId: 'employment',
    accessLevel: 'premium' as const,
    priceSgd: 49.90,
    downloadCount: 89,
    ratingAverage: 4.2,
    ratingCount: 15,
    isActive: true,
    isFeatured: false,
    tags: ['employment', 'contract'],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    category: {
      id: 'employment',
      name: 'Employment',
      description: 'Employment templates'
    }
  }
];

const mockCategories = [
  {
    id: 'business',
    name: 'Business',
    description: 'Business templates',
    templateCount: 25,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'employment',
    name: 'Employment',
    description: 'Employment templates',
    templateCount: 18,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

const renderTemplateBrowser = () => {
  return render(
    <BrowserRouter>
      <TemplateBrowser />
    </BrowserRouter>
  );
};

describe('TemplateBrowser', () => {
  beforeEach(() => {
    vi.mocked(templateMarketplaceService.searchTemplates).mockResolvedValue({
      templates: mockTemplates,
      total: 2,
      hasMore: false
    });

    vi.mocked(templateMarketplaceService.getCategories).mockResolvedValue(mockCategories);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render template browser with templates', async () => {
    renderTemplateBrowser();

    // Check if loading state is shown initially
    expect(screen.getByText('Loading templates...')).toBeInTheDocument();

    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('Business Agreement Template')).toBeInTheDocument();
      expect(screen.getByText('Employment Contract')).toBeInTheDocument();
    });

    // Check if template details are displayed
    expect(screen.getByText('A comprehensive business agreement template')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('S$49.90')).toBeInTheDocument();
  });

  it('should display template ratings correctly', async () => {
    renderTemplateBrowser();

    await waitFor(() => {
      expect(screen.getByText('Business Agreement Template')).toBeInTheDocument();
    });

    // Check if ratings are displayed
    const ratingElements = screen.getAllByText(/4\.[0-9]/);
    expect(ratingElements.length).toBeGreaterThan(0);

    // Check if rating counts are displayed
    expect(screen.getByText('(20)')).toBeInTheDocument();
    expect(screen.getByText('(15)')).toBeInTheDocument();
  });

  it('should handle search functionality', async () => {
    renderTemplateBrowser();

    await waitFor(() => {
      expect(screen.getByText('Business Agreement Template')).toBeInTheDocument();
    });

    // Find and interact with search input
    const searchInput = screen.getByPlaceholderText(/search templates/i);
    fireEvent.change(searchInput, { target: { value: 'business' } });

    // Wait for search to trigger
    await waitFor(() => {
      expect(templateMarketplaceService.searchTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'business'
        })
      );
    });
  });

  it('should handle category filtering', async () => {
    renderTemplateBrowser();

    await waitFor(() => {
      expect(screen.getByText('Business Agreement Template')).toBeInTheDocument();
    });

    // Find and click on a category filter
    const businessCategory = screen.getByText('Business');
    fireEvent.click(businessCategory);

    await waitFor(() => {
      expect(templateMarketplaceService.searchTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 'business'
        })
      );
    });
  });

  it('should handle access level filtering', async () => {
    renderTemplateBrowser();

    await waitFor(() => {
      expect(screen.getByText('Business Agreement Template')).toBeInTheDocument();
    });

    // Find access level filter (assuming it's a select or button)
    const accessLevelFilter = screen.getByText(/access level/i);
    fireEvent.click(accessLevelFilter);

    // Select premium option (this might need adjustment based on actual UI)
    const premiumOption = screen.getByText(/premium/i);
    fireEvent.click(premiumOption);

    await waitFor(() => {
      expect(templateMarketplaceService.searchTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          accessLevel: 'premium'
        })
      );
    });
  });

  it('should handle sorting options', async () => {
    renderTemplateBrowser();

    await waitFor(() => {
      expect(screen.getByText('Business Agreement Template')).toBeInTheDocument();
    });

    // Find sort dropdown
    const sortDropdown = screen.getByText(/sort by/i);
    fireEvent.click(sortDropdown);

    // Select popular sorting
    const popularOption = screen.getByText(/popular/i);
    fireEvent.click(popularOption);

    await waitFor(() => {
      expect(templateMarketplaceService.searchTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'popular'
        })
      );
    });
  });

  it('should handle template click and track analytics', async () => {
    const mockNavigate = vi.fn();
    vi.mocked(require('react-router-dom').useNavigate).mockReturnValue(mockNavigate);

    renderTemplateBrowser();

    await waitFor(() => {
      expect(screen.getByText('Business Agreement Template')).toBeInTheDocument();
    });

    // Click on a template
    const templateCard = screen.getByText('Business Agreement Template').closest('div');
    fireEvent.click(templateCard!);

    // Check if analytics event was tracked
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

  it('should display featured templates prominently', async () => {
    renderTemplateBrowser();

    await waitFor(() => {
      expect(screen.getByText('Business Agreement Template')).toBeInTheDocument();
    });

    // Check if featured badge is displayed for featured templates
    const featuredBadges = screen.getAllByText(/featured/i);
    expect(featuredBadges.length).toBeGreaterThan(0);
  });

  it('should handle load more functionality', async () => {
    // Mock hasMore as true
    vi.mocked(templateMarketplaceService.searchTemplates).mockResolvedValue({
      templates: mockTemplates,
      total: 50,
      hasMore: true
    });

    renderTemplateBrowser();

    await waitFor(() => {
      expect(screen.getByText('Business Agreement Template')).toBeInTheDocument();
    });

    // Find and click load more button
    const loadMoreButton = screen.getByText(/load more/i);
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(templateMarketplaceService.searchTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 20
        })
      );
    });
  });

  it('should handle error states gracefully', async () => {
    vi.mocked(templateMarketplaceService.searchTemplates).mockRejectedValue(
      new Error('Failed to load templates')
    );

    renderTemplateBrowser();

    await waitFor(() => {
      expect(screen.getByText(/failed to load templates/i)).toBeInTheDocument();
    });
  });

  it('should display empty state when no templates found', async () => {
    vi.mocked(templateMarketplaceService.searchTemplates).mockResolvedValue({
      templates: [],
      total: 0,
      hasMore: false
    });

    renderTemplateBrowser();

    await waitFor(() => {
      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });
  });

  it('should handle view mode toggle', async () => {
    renderTemplateBrowser();

    await waitFor(() => {
      expect(screen.getByText('Business Agreement Template')).toBeInTheDocument();
    });

    // Find view mode toggle buttons
    const gridViewButton = screen.getByLabelText(/grid view/i);
    const listViewButton = screen.getByLabelText(/list view/i);

    // Test switching to list view
    fireEvent.click(listViewButton);
    expect(listViewButton).toHaveClass('bg-blue-100'); // or whatever active class

    // Test switching back to grid view
    fireEvent.click(gridViewButton);
    expect(gridViewButton).toHaveClass('bg-blue-100'); // or whatever active class
  });
});
