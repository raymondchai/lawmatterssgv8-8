import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PublicDocumentUpload } from '@/components/legal/PublicDocumentUpload';

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn(),
}));

describe('PublicDocumentUpload Component', () => {
  const mockOnFileUpload = vi.fn();
  const mockGetRootProps = vi.fn(() => ({}));
  const mockGetInputProps = vi.fn(() => ({}));

  beforeEach(() => {
    vi.clearAllMocks();
    
    const { useDropzone } = require('react-dropzone');
    useDropzone.mockReturnValue({
      getRootProps: mockGetRootProps,
      getInputProps: mockGetInputProps,
      isDragActive: false,
    });
  });

  it('renders upload area with correct text', () => {
    render(
      <PublicDocumentUpload
        onFileUpload={mockOnFileUpload}
        maxFileSize={10 * 1024 * 1024}
        allowedTypes={['application/pdf', 'image/jpeg', 'image/png', 'image/webp']}
      />
    );

    expect(screen.getByText('Upload Document')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop your file here, or click to browse')).toBeInTheDocument();
    expect(screen.getByText('Maximum file size: 10MB')).toBeInTheDocument();
  });

  it('displays supported file type badges', () => {
    render(
      <PublicDocumentUpload
        onFileUpload={mockOnFileUpload}
        maxFileSize={10 * 1024 * 1024}
        allowedTypes={['application/pdf', 'image/jpeg', 'image/png', 'image/webp']}
      />
    );

    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('JPEG')).toBeInTheDocument();
    expect(screen.getByText('PNG')).toBeInTheDocument();
    expect(screen.getByText('WebP')).toBeInTheDocument();
  });

  it('shows drag active state', () => {
    const { useDropzone } = require('react-dropzone');
    useDropzone.mockReturnValue({
      getRootProps: mockGetRootProps,
      getInputProps: mockGetInputProps,
      isDragActive: true,
    });

    render(
      <PublicDocumentUpload
        onFileUpload={mockOnFileUpload}
        maxFileSize={10 * 1024 * 1024}
        allowedTypes={['application/pdf']}
      />
    );

    expect(screen.getByText('Drop your file here')).toBeInTheDocument();
  });

  it('displays error for invalid file size', async () => {
    const { useDropzone } = require('react-dropzone');
    
    // Mock file validation
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(mockFile, 'size', { value: 20 * 1024 * 1024 }); // 20MB

    let onDropCallback: (files: File[], rejectedFiles: any[]) => void;
    
    useDropzone.mockImplementation(({ onDrop }: any) => {
      onDropCallback = onDrop;
      return {
        getRootProps: mockGetRootProps,
        getInputProps: mockGetInputProps,
        isDragActive: false,
      };
    });

    render(
      <PublicDocumentUpload
        onFileUpload={mockOnFileUpload}
        maxFileSize={10 * 1024 * 1024}
        allowedTypes={['application/pdf']}
      />
    );

    // Simulate file drop with validation error
    onDropCallback!([], [{
      file: mockFile,
      errors: [{ code: 'file-too-large', message: 'File too large' }]
    }]);

    await waitFor(() => {
      expect(screen.getByText(/File size exceeds limit/)).toBeInTheDocument();
    });
  });

  it('displays error for invalid file type', async () => {
    const { useDropzone } = require('react-dropzone');
    
    const mockFile = new File(['test'], 'test.doc', { type: 'application/msword' });
    Object.defineProperty(mockFile, 'size', { value: 1024 });

    let onDropCallback: (files: File[], rejectedFiles: any[]) => void;
    
    useDropzone.mockImplementation(({ onDrop }: any) => {
      onDropCallback = onDrop;
      return {
        getRootProps: mockGetRootProps,
        getInputProps: mockGetInputProps,
        isDragActive: false,
      };
    });

    render(
      <PublicDocumentUpload
        onFileUpload={mockOnFileUpload}
        maxFileSize={10 * 1024 * 1024}
        allowedTypes={['application/pdf']}
      />
    );

    // Simulate file drop with type error
    onDropCallback!([], [{
      file: mockFile,
      errors: [{ code: 'file-invalid-type', message: 'Invalid file type' }]
    }]);

    await waitFor(() => {
      expect(screen.getByText('File type not supported')).toBeInTheDocument();
    });
  });

  it('shows selected file information', async () => {
    const { useDropzone } = require('react-dropzone');
    
    const mockFile = new File(['test content'], 'test-document.pdf', { type: 'application/pdf' });
    Object.defineProperty(mockFile, 'size', { value: 1024 });

    let onDropCallback: (files: File[], rejectedFiles: any[]) => void;
    
    useDropzone.mockImplementation(({ onDrop }: any) => {
      onDropCallback = onDrop;
      return {
        getRootProps: mockGetRootProps,
        getInputProps: mockGetInputProps,
        isDragActive: false,
      };
    });

    render(
      <PublicDocumentUpload
        onFileUpload={mockOnFileUpload}
        maxFileSize={10 * 1024 * 1024}
        allowedTypes={['application/pdf']}
      />
    );

    // Simulate successful file drop
    onDropCallback!([mockFile], []);

    await waitFor(() => {
      expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
      expect(screen.getByText('1 KB • application/pdf')).toBeInTheDocument();
      expect(screen.getByText('Analyze Document')).toBeInTheDocument();
    });
  });

  it('calls onFileUpload when analyze button is clicked', async () => {
    const { useDropzone } = require('react-dropzone');
    
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(mockFile, 'size', { value: 1024 });

    let onDropCallback: (files: File[], rejectedFiles: any[]) => void;
    
    useDropzone.mockImplementation(({ onDrop }: any) => {
      onDropCallback = onDrop;
      return {
        getRootProps: mockGetRootProps,
        getInputProps: mockGetInputProps,
        isDragActive: false,
      };
    });

    render(
      <PublicDocumentUpload
        onFileUpload={mockOnFileUpload}
        maxFileSize={10 * 1024 * 1024}
        allowedTypes={['application/pdf']}
      />
    );

    // Select file
    onDropCallback!([mockFile], []);

    await waitFor(() => {
      const analyzeButton = screen.getByText('Analyze Document');
      fireEvent.click(analyzeButton);
    });

    expect(mockOnFileUpload).toHaveBeenCalledWith(mockFile);
  });

  it('allows file removal', async () => {
    const { useDropzone } = require('react-dropzone');
    
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(mockFile, 'size', { value: 1024 });

    let onDropCallback: (files: File[], rejectedFiles: any[]) => void;
    
    useDropzone.mockImplementation(({ onDrop }: any) => {
      onDropCallback = onDrop;
      return {
        getRootProps: mockGetRootProps,
        getInputProps: mockGetInputProps,
        isDragActive: false,
      };
    });

    render(
      <PublicDocumentUpload
        onFileUpload={mockOnFileUpload}
        maxFileSize={10 * 1024 * 1024}
        allowedTypes={['application/pdf']}
      />
    );

    // Select file
    onDropCallback!([mockFile], []);

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    // Remove file
    const removeButton = screen.getByRole('button', { name: '' }); // X button
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
      expect(screen.queryByText('Analyze Document')).not.toBeInTheDocument();
    });
  });

  it('disables upload when disabled prop is true', () => {
    render(
      <PublicDocumentUpload
        onFileUpload={mockOnFileUpload}
        disabled={true}
        maxFileSize={10 * 1024 * 1024}
        allowedTypes={['application/pdf']}
      />
    );

    const uploadArea = screen.getByText('Upload Document').closest('div');
    expect(uploadArea).toHaveClass('opacity-50');
  });

  it('displays upload guidelines', () => {
    render(
      <PublicDocumentUpload
        onFileUpload={mockOnFileUpload}
        maxFileSize={10 * 1024 * 1024}
        allowedTypes={['application/pdf']}
      />
    );

    expect(screen.getByText('Upload Guidelines:')).toBeInTheDocument();
    expect(screen.getByText('Ensure document text is clear and readable')).toBeInTheDocument();
    expect(screen.getByText('For best results, use high-resolution scans')).toBeInTheDocument();
    expect(screen.getByText('Documents are automatically deleted after 24 hours')).toBeInTheDocument();
    expect(screen.getByText('No personal information is stored permanently')).toBeInTheDocument();
  });

  it('formats file size correctly', async () => {
    const { useDropzone } = require('react-dropzone');
    
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(mockFile, 'size', { value: 1536 }); // 1.5 KB

    let onDropCallback: (files: File[], rejectedFiles: any[]) => void;
    
    useDropzone.mockImplementation(({ onDrop }: any) => {
      onDropCallback = onDrop;
      return {
        getRootProps: mockGetRootProps,
        getInputProps: mockGetInputProps,
        isDragActive: false,
      };
    });

    render(
      <PublicDocumentUpload
        onFileUpload={mockOnFileUpload}
        maxFileSize={10 * 1024 * 1024}
        allowedTypes={['application/pdf']}
      />
    );

    onDropCallback!([mockFile], []);

    await waitFor(() => {
      expect(screen.getByText('1.5 KB • application/pdf')).toBeInTheDocument();
    });
  });
});
