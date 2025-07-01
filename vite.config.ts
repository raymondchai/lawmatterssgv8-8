import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
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
    react({
      // Use classic JSX runtime for maximum compatibility
      jsxRuntime: 'classic',
      jsxImportSource: undefined,
      // Disable SWC optimizations that can cause issues
      babel: {
        plugins: []
      }
    }),
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
        // Aggressive cache busting with content hashes
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        manualChunks: {
          // CRITICAL: React must be in a separate chunk that loads FIRST
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Increase chunk size warning limit to reduce noise
    chunkSizeWarningLimit: 1000,
    // Disable source maps for production builds to reduce size
    sourcemap: false,
    // Conservative minification to prevent React issues
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console.log for debugging
        drop_debugger: true, // Remove debugger statements
        pure_funcs: [], // Don't remove any functions
        keep_fnames: true, // Keep function names for React
        keep_classnames: true, // Keep class names for React
      },
      mangle: {
        keep_fnames: true, // Keep function names
        keep_classnames: true, // Keep class names
      },
    },
    // Target modern browsers for better optimization
    target: 'es2020',
  },
  // Optimize dependencies - CRITICAL FIX FOR REACT LOADING
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom'
    ],
    exclude: ['tesseract.js', 'pdfjs-dist'], // Exclude heavy libraries from optimization
    force: true, // Force re-optimization
  },
  // Handle Node.js polyfills and globals
  define: {
    global: 'globalThis',
    // Don't override process.env - let Vite handle environment variables
  },
}));
