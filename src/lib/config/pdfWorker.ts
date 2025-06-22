import * as pdfjs from 'pdfjs-dist';

// Centralized PDF.js worker configuration
const PDF_JS_VERSION = '3.11.174';
const WORKER_SRC = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.js`;

let workerInitialized = false;

export const initializePdfWorker = () => {
  if (!workerInitialized) {
    pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
    workerInitialized = true;
    console.log('PDF.js worker initialized with:', WORKER_SRC);
  }
};

export const getPdfJs = () => {
  initializePdfWorker();
  return pdfjs;
};

export { pdfjs };
