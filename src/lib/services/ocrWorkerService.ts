// OCR Worker Service - Manages web worker for OCR processing
import type { OCRWorkerMessage, OCRWorkerResponse } from '@/lib/workers/ocrWorker';

export interface OCRProgress {
  progress: number;
  status: string;
}

export interface OCRResult {
  text: string;
  confidence: number;
}

class OCRWorkerService {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, {
    resolve: (result: OCRResult) => void;
    reject: (error: Error) => void;
    onProgress?: (progress: OCRProgress) => void;
  }>();

  private initializeWorker() {
    if (this.worker) return;

    try {
      // Create worker from the TypeScript file
      this.worker = new Worker(
        new URL('../workers/ocrWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<OCRWorkerResponse>) => {
        const { type, data, id } = event.data;
        const request = this.pendingRequests.get(id);

        if (!request) return;

        switch (type) {
          case 'OCR_RESULT':
            if (data.text !== undefined && data.confidence !== undefined) {
              request.resolve({
                text: data.text,
                confidence: data.confidence
              });
              this.pendingRequests.delete(id);
            }
            break;

          case 'OCR_ERROR':
            request.reject(new Error(data.error || 'OCR processing failed'));
            this.pendingRequests.delete(id);
            break;

          case 'OCR_PROGRESS':
            if (request.onProgress && data.progress !== undefined) {
              request.onProgress({
                progress: data.progress,
                status: 'Processing...'
              });
            }
            break;
        }
      };

      this.worker.onerror = (error) => {
        console.error('OCR Worker error:', error);
        // Reject all pending requests
        this.pendingRequests.forEach(({ reject }) => {
          reject(new Error('Worker error occurred'));
        });
        this.pendingRequests.clear();
      };
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
      throw new Error('OCR worker initialization failed');
    }
  }

  async processImage(
    imageData: string | ArrayBuffer,
    options: {
      language?: string;
      confidence?: number;
      onProgress?: (progress: OCRProgress) => void;
    } = {}
  ): Promise<OCRResult> {
    this.initializeWorker();

    if (!this.worker) {
      throw new Error('OCR worker not available');
    }

    const id = Math.random().toString(36).substr(2, 9);

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve,
        reject,
        onProgress: options.onProgress
      });

      const message: OCRWorkerMessage = {
        type: 'PROCESS_IMAGE',
        data: {
          imageData,
          options: {
            language: options.language,
            confidence: options.confidence
          }
        },
        id
      };

      this.worker!.postMessage(message);
    });
  }

  async processPdfPage(
    canvas: ImageData,
    options: {
      language?: string;
      confidence?: number;
      onProgress?: (progress: OCRProgress) => void;
    } = {}
  ): Promise<OCRResult> {
    this.initializeWorker();

    if (!this.worker) {
      throw new Error('OCR worker not available');
    }

    const id = Math.random().toString(36).substr(2, 9);

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve,
        reject,
        onProgress: options.onProgress
      });

      const message: OCRWorkerMessage = {
        type: 'PROCESS_PDF_PAGE',
        data: {
          canvas,
          options: {
            language: options.language,
            confidence: options.confidence
          }
        },
        id
      };

      this.worker!.postMessage(message);
    });
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    // Reject all pending requests
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('OCR service terminated'));
    });
    this.pendingRequests.clear();
  }

  isAvailable(): boolean {
    return typeof Worker !== 'undefined';
  }
}

// Export singleton instance
export const ocrWorkerService = new OCRWorkerService();
