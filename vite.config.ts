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
    react({
      // Force consistent JSX runtime
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
      // Ensure React is always available
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
        ]
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
        // Aggressive cache busting with timestamp and content hashes
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`,
        manualChunks: {
          // CRITICAL: React must be in a separate chunk that loads FIRST
          'react-vendor': ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],

          // UI components that depend on React
          'ui-components': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip',
            'lucide-react',
            'class-variance-authority',
            'clsx',
            'tailwind-merge'
          ],

          // Other chunks
          'data-fetching': ['@tanstack/react-query'],
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'utilities': ['date-fns', 'lodash', 'uuid'],
          'supabase': ['@supabase/supabase-js'],
          'ai-services': ['openai'],
          'pdf-worker': ['pdfjs-dist'],
          'ocr-worker': ['tesseract.js']
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
      'react-dom/client',
      'react-router-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime'
    ],
    exclude: ['tesseract.js', 'pdfjs-dist'], // Exclude heavy libraries from optimization
    force: true, // Force re-optimization
  },
  // Handle Node.js polyfills and globals
  define: {
    global: 'globalThis',
    'process.env': {},
  },
}));
