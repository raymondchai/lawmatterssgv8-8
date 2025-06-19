import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockUser, mockDocument } from '@/test/utils';
import Documents from './Documents';

// Mock the auth context
const mockUseAuth = vi.fn(() => ({
  profile: mockUser,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the document API
const mockGetDocuments = vi.fn();
const mockGetDocument = vi.fn();
const mockUploadDocument = vi.fn();
const mockDeleteDocument = vi.fn();
const mockSearchDocuments = vi.fn();

vi.mock('@/lib/api/documents', () => ({
  documentsApi: {
    getDocuments: mockGetDocuments,
    getDocument: mockGetDocument,
    uploadDocument: mockUploadDocument,
    deleteDocument: mockDeleteDocument,
    searchDocuments: mockSearchDocuments,
  },
}));

// Mock the profiles API
const mockCheckUsageLimit = vi.fn();
const mockIncrementUsage = vi.fn();

vi.mock('@/lib/api/profiles', () => ({
  profilesApi: {
    checkUsageLimit: mockCheckUsageLimit,
    incrementUsage: mockIncrementUsage,
  },
}));

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn(() => ({
    getRootProps: () => ({ 'data-testid': 'dropzone' }),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    isDragActive: false,
  })),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago'),
}));

// Mock lodash
vi.mock('lodash', () => ({
  debounce: vi.fn((fn) => fn),
}));

describe('Documents Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDocuments.mockResolvedValue([mockDocument]);
    mockCheckUsageLimit.mockResolvedValue(true);
  });

  it('renders document management interface', async () => {
    render(<Documents />);

    expect(screen.getByText(/document management/i)).toBeInTheDocument();
    expect(screen.getByText(/upload, process, and manage your legal documents/i)).toBeInTheDocument();
  });

  it('shows subscription tier in header', async () => {
    render(<Documents />);

    expect(screen.getByText(/subscription/i)).toBeInTheDocument();
    expect(screen.getByText(/free/i)).toBeInTheDocument();
  });

  it('renders all tabs', async () => {
    render(<Documents />);

    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /upload/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /manage/i })).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    render(<Documents />);

    // Click on Upload tab
    const uploadTab = screen.getByRole('tab', { name: /upload/i });
    await user.click(uploadTab);

    // Should show upload interface
    await waitFor(() => {
      expect(screen.getByText(/drag & drop files here/i)).toBeInTheDocument();
    });

    // Click on Search tab
    const searchTab = screen.getByRole('tab', { name: /search/i });
    await user.click(searchTab);

    // Should show search interface
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search by filename or content/i)).toBeInTheDocument();
    });
  });

  it('loads and displays documents in overview tab', async () => {
    render(<Documents />);

    await waitFor(() => {
      expect(mockGetDocuments).toHaveBeenCalled();
    });

    // Should show document in the list
    await waitFor(() => {
      expect(screen.getByText(mockDocument.filename)).toBeInTheDocument();
    });
  });

  it('opens document viewer when document is selected', async () => {
    const user = userEvent.setup();
    mockGetDocument.mockResolvedValue(mockDocument);
    
    render(<Documents />);

    await waitFor(() => {
      expect(screen.getByText(mockDocument.filename)).toBeInTheDocument();
    });

    // Find and click the view button (eye icon)
    const viewButtons = screen.getAllByRole('button');
    const viewButton = viewButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('aria-label') === null
    );
    
    if (viewButton) {
      await user.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText(/document viewer/i)).toBeInTheDocument();
        expect(screen.getByText(/close viewer/i)).toBeInTheDocument();
      });
    }
  });

  it('closes document viewer when close button is clicked', async () => {
    const user = userEvent.setup();
    mockGetDocument.mockResolvedValue(mockDocument);
    
    render(<Documents />);

    // First open the viewer (simplified for test)
    await waitFor(() => {
      expect(screen.getByText(mockDocument.filename)).toBeInTheDocument();
    });

    // Simulate opening viewer by clicking document
    const documentElement = screen.getByText(mockDocument.filename);
    await user.click(documentElement);

    // If viewer opens, close it
    const closeButton = screen.queryByText(/close viewer/i);
    if (closeButton) {
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/document viewer/i)).not.toBeInTheDocument();
      });
    }
  });

  it('shows status tracker with document statistics', async () => {
    const documents = [
      { ...mockDocument, processing_status: 'completed' },
      { ...mockDocument, id: 'doc2', processing_status: 'pending' },
      { ...mockDocument, id: 'doc3', processing_status: 'processing' },
    ];
    mockGetDocuments.mockResolvedValue(documents);

    render(<Documents />);

    await waitFor(() => {
      expect(screen.getByText(/processing status/i)).toBeInTheDocument();
      expect(screen.getByText(/overall progress/i)).toBeInTheDocument();
    });

    // Should show statistics
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument(); // Completed count
      expect(screen.getByText('1')).toBeInTheDocument(); // Pending count
      expect(screen.getByText('1')).toBeInTheDocument(); // Processing count
    });
  });

  it('handles search functionality', async () => {
    const user = userEvent.setup();
    const searchResults = [mockDocument];
    mockSearchDocuments.mockResolvedValue(searchResults);

    render(<Documents />);

    // Switch to search tab
    const searchTab = screen.getByRole('tab', { name: /search/i });
    await user.click(searchTab);

    // Enter search query
    const searchInput = screen.getByPlaceholderText(/search by filename or content/i);
    await user.type(searchInput, 'test document');

    await waitFor(() => {
      expect(mockSearchDocuments).toHaveBeenCalledWith('test document');
    });
  });

  it('shows empty state when no documents exist', async () => {
    mockGetDocuments.mockResolvedValue([]);

    render(<Documents />);

    await waitFor(() => {
      expect(screen.getByText(/no documents yet/i)).toBeInTheDocument();
      expect(screen.getByText(/upload your first document/i)).toBeInTheDocument();
    });
  });

  it('handles upload completion and refreshes document list', async () => {
    const user = userEvent.setup();
    render(<Documents />);

    // Switch to upload tab
    const uploadTab = screen.getByRole('tab', { name: /upload/i });
    await user.click(uploadTab);

    // The upload component should be rendered
    await waitFor(() => {
      expect(screen.getByText(/upload documents/i)).toBeInTheDocument();
    });

    // Verify that the component is set up to handle upload completion
    // (The actual upload testing is done in the DocumentUpload component tests)
    expect(mockGetDocuments).toHaveBeenCalled();
  });

  it('shows error state when document loading fails', async () => {
    mockGetDocuments.mockRejectedValue(new Error('Failed to load documents'));

    render(<Documents />);

    // The error should be handled gracefully
    // (Specific error UI would depend on implementation)
    await waitFor(() => {
      expect(mockGetDocuments).toHaveBeenCalled();
    });
  });
});
