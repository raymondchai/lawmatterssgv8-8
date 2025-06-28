import React from 'react'
import * as ReactNamespace from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// CRITICAL FIX: Ensure React is available globally for production builds
if (typeof window !== 'undefined') {
  (window as any).React = ReactNamespace;
  (window as any).ReactDOM = { createRoot };
  // Additional safety for mixed JSX runtime compatibility
  (window as any).react = ReactNamespace;
}

// Enhanced error handling for React initialization
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  const root = createRoot(rootElement);
  root.render(<App />);
} catch (error) {
  console.error("Failed to initialize React application:", error);
  // Fallback: Show error message in the root element
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h1>Application Loading Error</h1>
        <p>Please refresh the page or contact support if the issue persists.</p>
        <p style="color: #666; font-size: 12px;">Error: ${error}</p>
      </div>
    `;
  }
}
