// Centralized PDF.js worker configuration with dynamic imports
let workerInitialized = false;
let pdfjsInstance: any = null;

export const initializePdfWorker = async () => {
  if (!workerInitialized && typeof window !== 'undefined') {
    try {
      // Dynamic import to avoid loading PDF.js on server or when not needed
      const pdfjs = await import('pdfjs-dist');
      pdfjsInstance = pdfjs;

      // Use the version that comes with react-pdf
      const WORKER_SRC = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();
      pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
      workerInitialized = true;
      console.log('PDF.js worker initialized with:', WORKER_SRC);
    } catch (error) {
      console.error('Failed to initialize PDF.js worker:', error);
    }
  }
};

export const getPdfJs = async () => {
  if (!pdfjsInstance) {
    await initializePdfWorker();
  }
  return pdfjsInstance;
};
