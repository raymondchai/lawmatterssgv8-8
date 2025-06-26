#!/usr/bin/env node

/**
 * Simple script to run Playwright MCP for LawMattersSG testing
 * Usage: node scripts/run-playwright-mcp.js
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🎭 Starting Playwright MCP for LawMattersSG...');
console.log('📍 Target URL: https://craftchatbot.com/');
console.log('🎯 Focus: Navigation and authentication testing');

// Start the Playwright MCP server
const mcpProcess = spawn('npx', ['@playwright/mcp@latest'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true
});

mcpProcess.on('error', (error) => {
  console.error('❌ Error starting Playwright MCP:', error);
});

mcpProcess.on('close', (code) => {
  console.log(`🏁 Playwright MCP process exited with code ${code}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Playwright MCP...');
  mcpProcess.kill('SIGINT');
  process.exit(0);
});

console.log('\n📝 Instructions:');
console.log('1. The MCP server is now running');
console.log('2. Open Claude Desktop');
console.log('3. Use the Playwright tools to explore your site');
console.log('4. Press Ctrl+C to stop the server');
