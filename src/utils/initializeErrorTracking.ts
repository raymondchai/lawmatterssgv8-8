// Conditional error tracking initialization
// Only loads error tracking when needed to reduce overhead

// Initialize error tracking conditionally
if (import.meta.env.DEV || import.meta.env.VITE_ERROR_TRACKING === 'true') {
  import('./errorTracking').then(() => {
    console.log('🐛 Error tracking initialized');
  }).catch((error) => {
    console.warn('Failed to initialize error tracking:', error);
  });
}

export {}; // Make this a module
