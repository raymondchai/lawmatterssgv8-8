import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { copyFileSync, existsSync } from "fs";

// Custom plugin to copy .htaccess file
const copyHtaccessPlugin = () => ({
  name: 'copy-htaccess',
  writeBundle() {
    const htaccessSource = '.htaccess.craftchatbot';
    const htaccessDest = 'dist/.htaccess';

    if (existsSync(htaccessSource)) {
      copyFileSync(htaccessSource, htaccessDest);
      console.log('✅ .htaccess file copied to dist folder');
    } else {
      console.warn('⚠️ .htaccess.craftchatbot not found - skipping copy');
    }
  }
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Use relative paths for assets to work with any deployment setup
  base: './',
  server: {
    host: "localhost",
    port: 8082,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    copyHtaccessPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Add polyfills for Node.js modules
      "buffer": "buffer",
      "process": "process/browser",
      "util": "util",
    },
  },
  // Worker configuration
  worker: {
    format: 'es',
    plugins: () => [react()],
  },
  // Build optimization
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // PDF and OCR workers
          if (id.includes('pdfjs-dist')) return 'pdf-worker';
          if (id.includes('tesseract.js')) return 'ocr-worker';

          // Core React libraries
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'react-vendor';
          }

          // UI component libraries
          if (id.includes('@radix-ui') || id.includes('lucide-react')) {
            return 'ui-components';
          }

          // Form and validation libraries
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
            return 'forms';
          }

          // Data fetching and state management
          if (id.includes('@tanstack') || id.includes('react-query')) {
            return 'data-fetching';
          }

          // Supabase and authentication
          if (id.includes('@supabase') || id.includes('supabase')) {
            return 'supabase';
          }

          // AI and OpenAI libraries
          if (id.includes('openai') || id.includes('ai')) {
            return 'ai-services';
          }

          // Date and utility libraries
          if (id.includes('date-fns') || id.includes('lodash') || id.includes('uuid')) {
            return 'utilities';
          }

          // Document processing libraries
          if (id.includes('docx') || id.includes('jspdf') || id.includes('html2canvas')) {
            return 'document-processing';
          }

          // Other large vendor libraries
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    // Increase chunk size warning limit to reduce noise
    chunkSizeWarningLimit: 1000,
    // Disable source maps for production builds to reduce size
    sourcemap: false,
    // Optimize for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true, // Remove debugger statements
        pure_funcs: ['console.log', 'console.warn'], // Remove specific console methods
      },
    },
    // Target modern browsers for better optimization
    target: 'es2020',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'react/jsx-runtime'],
    exclude: ['tesseract.js', 'pdfjs-dist'], // Exclude heavy libraries from optimization
    force: true, // Force re-optimization
  },
  // Handle Node.js polyfills and globals
  define: {
    global: 'globalThis',
    'process.env': {},
  },
}));
