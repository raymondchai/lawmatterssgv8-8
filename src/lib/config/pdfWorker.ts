// Centralized PDF.js worker configuration with dynamic imports
let workerInitialized = false;
let pdfjsInstance: any = null;

export const initializePdfWorker = async () => {
  if (!workerInitialized && typeof window !== 'undefined') {
    try {
      // Dynamic import to avoid loading PDF.js on server or when not needed
      const pdfjs = await import('pdfjs-dist');
      pdfjsInstance = pdfjs;

      // Try multiple worker source options for better compatibility
      const workerSources = [
        new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString(),
        '/node_modules/pdfjs-dist/build/pdf.worker.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      ];

      let workerLoaded = false;
      for (const workerSrc of workerSources) {
        try {
          pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
          // Test if worker loads by creating a simple document
          await pdfjs.getDocument({ data: new Uint8Array([37, 80, 68, 70]) }).promise;
          console.log('PDF.js worker initialized with:', workerSrc);
          workerLoaded = true;
          break;
        } catch (testError) {
          console.warn('Worker source failed:', workerSrc, testError);
          continue;
        }
      }

      if (!workerLoaded) {
        throw new Error('All PDF worker sources failed to initialize');
      }

      workerInitialized = true;
    } catch (error) {
      console.error('Failed to initialize PDF.js worker:', error);
      throw error;
    }
  }
};

export const getPdfJs = async () => {
  if (!pdfjsInstance) {
    await initializePdfWorker();
  }
  return pdfjsInstance;
};
