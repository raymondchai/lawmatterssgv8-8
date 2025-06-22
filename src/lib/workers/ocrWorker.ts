// OCR Web Worker to prevent main thread blocking

export interface OCRWorkerMessage {
  type: 'PROCESS_IMAGE' | 'PROCESS_PDF_PAGE';
  data: {
    imageData?: string | ArrayBuffer;
    canvas?: ImageData;
    options?: {
      language?: string;
      confidence?: number;
    };
  };
  id: string;
}

export interface OCRWorkerResponse {
  type: 'OCR_RESULT' | 'OCR_ERROR' | 'OCR_PROGRESS';
  data: {
    text?: string;
    confidence?: number;
    progress?: number;
    error?: string;
  };
  id: string;
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<OCRWorkerMessage>) => {
  const { type, data, id } = event.data;

  try {
    switch (type) {
      case 'PROCESS_IMAGE':
        await processImage(data, id);
        break;
      case 'PROCESS_PDF_PAGE':
        await processPdfPage(data, id);
        break;
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    const response: OCRWorkerResponse = {
      type: 'OCR_ERROR',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
      id
    };
    self.postMessage(response);
  }
};

async function processImage(data: OCRWorkerMessage['data'], id: string) {
  const { imageData, options = {} } = data;

  if (!imageData) {
    throw new Error('No image data provided');
  }

  // Dynamic import to avoid loading Tesseract.js when not needed
  const Tesseract = await import('tesseract.js');

  const worker = await Tesseract.createWorker({
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const response: OCRWorkerResponse = {
          type: 'OCR_PROGRESS',
          data: { progress: m.progress },
          id
        };
        self.postMessage(response);
      }
    }
  });

  try {
    await worker.loadLanguage(options.language || 'eng');
    await worker.initialize(options.language || 'eng');
    
    const { data: result } = await worker.recognize(imageData);
    
    const response: OCRWorkerResponse = {
      type: 'OCR_RESULT',
      data: {
        text: result.text,
        confidence: result.confidence
      },
      id
    };
    
    self.postMessage(response);
  } finally {
    await worker.terminate();
  }
}

async function processPdfPage(data: OCRWorkerMessage['data'], id: string) {
  const { canvas, options = {} } = data;

  if (!canvas) {
    throw new Error('No canvas data provided');
  }

  // Dynamic import to avoid loading Tesseract.js when not needed
  const Tesseract = await import('tesseract.js');

  const worker = await Tesseract.createWorker({
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const response: OCRWorkerResponse = {
          type: 'OCR_PROGRESS',
          data: { progress: m.progress },
          id
        };
        self.postMessage(response);
      }
    }
  });

  try {
    await worker.loadLanguage(options.language || 'eng');
    await worker.initialize(options.language || 'eng');
    
    const { data: result } = await worker.recognize(canvas);
    
    const response: OCRWorkerResponse = {
      type: 'OCR_RESULT',
      data: {
        text: result.text,
        confidence: result.confidence
      },
      id
    };
    
    self.postMessage(response);
  } finally {
    await worker.terminate();
  }
}
