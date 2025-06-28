export interface OCRResult {
  text: string;
  confidence: number;
  pages: Array<{
    pageNumber: number;
    text: string;
    confidence: number;
  }>;
  metadata: {
    processingTime: number;
    fileSize: number;
    pageCount: number;
  };
}

export interface OCRProgress {
  status: 'initializing' | 'processing' | 'completed' | 'error';
  progress: number;
  currentPage?: number;
  totalPages?: number;
  message?: string;
}

/**
 * Extract text from PDF files
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    onProgress?.({
      status: 'initializing',
      progress: 0,
      message: 'Loading PDF...'
    });

    // Dynamic import to avoid loading PDF.js when not needed
    const { getPdfJs } = await import('@/lib/config/pdfWorker');
    const pdfjsLib = await getPdfJs();

    if (!pdfjsLib) {
      throw new Error('PDF.js failed to load. Please refresh the page and try again.');
    }

    onProgress?.({
      status: 'initializing',
      progress: 5,
      message: 'Reading PDF file...'
    });

    const arrayBuffer = await file.arrayBuffer();

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('PDF file appears to be empty or corrupted');
    }

    onProgress?.({
      status: 'initializing',
      progress: 10,
      message: 'Parsing PDF document...'
    });

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      // Add error recovery options
      verbosity: 0, // Reduce console noise
      isEvalSupported: false, // Security
      disableFontFace: true, // Performance
      useSystemFonts: false // Consistency
    }).promise;
    const totalPages = pdf.numPages;

    if (totalPages === 0) {
      throw new Error('PDF document contains no pages');
    }

    if (totalPages > 100) {
      throw new Error(`PDF document has too many pages (${totalPages}). Maximum supported is 100 pages.`);
    }

    const pages: Array<{ pageNumber: number; text: string; confidence: number }> = [];
    let allText = '';
    let processedPages = 0;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        onProgress?.({
          status: 'processing',
          progress: 15 + ((pageNum - 1) / totalPages * 80), // 15% to 95%
          currentPage: pageNum,
          totalPages,
          message: `Processing page ${pageNum} of ${totalPages}...`
        });

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        const pageText = textContent.items
          .map((item: any) => {
            // Handle different text item types safely
            if (typeof item === 'object' && item !== null) {
              return item.str || item.text || '';
            }
            return String(item || '');
          })
          .filter(text => text.trim().length > 0)
          .join(' ')
          .trim();

        pages.push({
          pageNumber: pageNum,
          text: pageText,
          confidence: 0.95 // PDF text extraction is generally very reliable
        });

        allText += pageText + '\n';
        processedPages++;

      } catch (pageError) {
        console.warn(`Failed to process page ${pageNum}:`, pageError);
        // Continue with other pages, but record the issue
        pages.push({
          pageNumber: pageNum,
          text: `[Page ${pageNum} could not be processed]`,
          confidence: 0
        });
      }
    }

    if (processedPages === 0) {
      throw new Error('Failed to process any pages from the PDF document');
    }

    const processingTime = Date.now() - startTime;
    
    onProgress?.({
      status: 'completed',
      progress: 100,
      message: 'PDF processing completed'
    });

    return {
      text: allText.trim(),
      confidence: 0.95,
      pages,
      metadata: {
        processingTime,
        fileSize: file.size,
        pageCount: totalPages
      }
    };
  } catch (error) {
    console.error('Error extracting text from PDF:', error);

    let errorMessage = 'Failed to extract text from PDF';

    if (error instanceof Error) {
      // Provide more specific error messages
      if (error.message.includes('Invalid PDF')) {
        errorMessage = 'The uploaded file is not a valid PDF document';
      } else if (error.message.includes('Password')) {
        errorMessage = 'This PDF is password protected. Please upload an unlocked PDF';
      } else if (error.message.includes('corrupted')) {
        errorMessage = 'The PDF file appears to be corrupted. Please try uploading again';
      } else if (error.message.includes('too many pages')) {
        errorMessage = error.message;
      } else if (error.message.includes('PDF.js failed to load')) {
        errorMessage = 'PDF processing library failed to load. Please refresh the page and try again';
      } else if (error.message.includes('empty')) {
        errorMessage = 'The PDF file appears to be empty';
      } else {
        errorMessage = `PDF processing failed: ${error.message}`;
      }
    }

    onProgress?.({
      status: 'error',
      progress: 0,
      message: errorMessage
    });

    throw new Error(errorMessage);
  }
}

/**
 * Extract text from images using OCR
 */
export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    onProgress?.({
      status: 'initializing',
      progress: 0,
      message: 'Initializing OCR...'
    });

    // Dynamic import to avoid loading Tesseract.js when not needed
    const Tesseract = await import('tesseract.js');

    const result = await Tesseract.recognize(file, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress?.({
            status: 'processing',
            progress: m.progress * 100,
            message: `OCR processing: ${Math.round(m.progress * 100)}%`
          });
        }
      }
    });

    const processingTime = Date.now() - startTime;
    
    onProgress?.({
      status: 'completed',
      progress: 100,
      message: 'OCR processing completed'
    });

    return {
      text: result.data.text,
      confidence: result.data.confidence / 100, // Convert to 0-1 scale
      pages: [{
        pageNumber: 1,
        text: result.data.text,
        confidence: result.data.confidence / 100
      }],
      metadata: {
        processingTime,
        fileSize: file.size,
        pageCount: 1
      }
    };
  } catch (error) {
    console.error('Error performing OCR:', error);
    onProgress?.({
      status: 'error',
      progress: 0,
      message: 'OCR processing failed'
    });
    throw new Error('Failed to perform OCR on image');
  }
}

/**
 * Extract text from various document types
 */
export async function extractTextFromDocument(
  file: File,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  // Handle PDF files
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractTextFromPDF(file, onProgress);
  }
  
  // Handle image files
  if (fileType.startsWith('image/') || 
      fileName.endsWith('.jpg') || 
      fileName.endsWith('.jpeg') || 
      fileName.endsWith('.png') || 
      fileName.endsWith('.gif') || 
      fileName.endsWith('.bmp') || 
      fileName.endsWith('.tiff')) {
    return extractTextFromImage(file, onProgress);
  }
  
  // Handle text files
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    const startTime = Date.now();
    
    onProgress?.({
      status: 'processing',
      progress: 50,
      message: 'Reading text file...'
    });
    
    const text = await file.text();
    const processingTime = Date.now() - startTime;
    
    onProgress?.({
      status: 'completed',
      progress: 100,
      message: 'Text file processed'
    });
    
    return {
      text,
      confidence: 1.0, // Text files are 100% accurate
      pages: [{
        pageNumber: 1,
        text,
        confidence: 1.0
      }],
      metadata: {
        processingTime,
        fileSize: file.size,
        pageCount: 1
      }
    };
  }
  
  throw new Error(`Unsupported file type: ${fileType}`);
}

/**
 * Validate OCR quality and suggest improvements
 */
export function validateOCRQuality(result: OCRResult): {
  isGoodQuality: boolean;
  suggestions: string[];
  qualityScore: number;
} {
  const { text, confidence } = result;
  const suggestions: string[] = [];
  
  // Check confidence level
  if (confidence < 0.7) {
    suggestions.push('Low confidence detected. Consider rescanning with higher resolution.');
  }
  
  // Check for common OCR errors
  const suspiciousPatterns = [
    /[0O]{3,}/, // Multiple zeros/Os in a row
    /[1Il]{3,}/, // Multiple 1s/Is/ls in a row
    /\s{5,}/, // Large gaps in text
    /[^\w\s.,;:!?()-]{3,}/, // Multiple special characters
  ];
  
  const hasErrors = suspiciousPatterns.some(pattern => pattern.test(text));
  if (hasErrors) {
    suggestions.push('Potential OCR errors detected. Review the extracted text carefully.');
  }
  
  // Check text length
  if (text.length < 50) {
    suggestions.push('Very little text extracted. Ensure the document contains readable text.');
  }
  
  // Calculate quality score
  let qualityScore = confidence;
  if (hasErrors) qualityScore -= 0.2;
  if (text.length < 50) qualityScore -= 0.3;
  
  qualityScore = Math.max(0, Math.min(1, qualityScore));
  
  return {
    isGoodQuality: qualityScore >= 0.7,
    suggestions,
    qualityScore
  };
}

/**
 * Clean and normalize extracted text
 */
export function cleanExtractedText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove common OCR artifacts
    .replace(/[^\w\s.,;:!?()"-]/g, '')
    // Fix common character substitutions
    .replace(/0/g, 'O') // In context where O makes more sense
    .replace(/1/g, 'I') // In context where I makes more sense
    // Normalize line breaks
    .replace(/\n+/g, '\n')
    .trim();
}
