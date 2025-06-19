#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { CodeQualityAnalyzer } from './tools/codeQualityAnalyzer.js';
import { TaskAutomator } from './tools/taskAutomator.js';
import { CodeReviewer } from './tools/codeReviewer.js';
import { ProjectWatcher } from './tools/projectWatcher.js';

class LawMattersServerMCP {
  private server: Server;
  private codeQualityAnalyzer: CodeQualityAnalyzer;
  private taskAutomator: TaskAutomator;
  private codeReviewer: CodeReviewer;
  private projectWatcher: ProjectWatcher;

  constructor() {
    this.server = new Server(
      {
        name: 'lawmatters-mcp-server',
        version: '1.0.0',
      }
    );

    this.codeQualityAnalyzer = new CodeQualityAnalyzer();
    this.taskAutomator = new TaskAutomator();
    this.codeReviewer = new CodeReviewer();
    this.projectWatcher = new ProjectWatcher();

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Code Quality Tools
          {
            name: 'analyze_code_quality',
            description: 'Analyze code quality, detect issues, and suggest improvements',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the file or directory to analyze',
                },
                rules: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific rules to check (optional)',
                },
              },
              required: ['filePath'],
            },
          },
          {
            name: 'lint_project',
            description: 'Run comprehensive linting on the entire project',
            inputSchema: {
              type: 'object',
              properties: {
                fix: {
                  type: 'boolean',
                  description: 'Automatically fix issues where possible',
                  default: false,
                },
              },
            },
          },
          // Task Automation Tools
          {
            name: 'generate_component',
            description: 'Generate React component with TypeScript and tests',
            inputSchema: {
              type: 'object',
              properties: {
                componentName: {
                  type: 'string',
                  description: 'Name of the component to generate',
                },
                componentType: {
                  type: 'string',
                  enum: ['functional', 'class'],
                  description: 'Type of component to generate',
                  default: 'functional',
                },
                includeTests: {
                  type: 'boolean',
                  description: 'Generate test files',
                  default: true,
                },
                includeStories: {
                  type: 'boolean',
                  description: 'Generate Storybook stories',
                  default: false,
                },
              },
              required: ['componentName'],
            },
          },
          {
            name: 'create_api_endpoint',
            description: 'Generate API endpoint with Supabase integration',
            inputSchema: {
              type: 'object',
              properties: {
                endpointName: {
                  type: 'string',
                  description: 'Name of the API endpoint',
                },
                methods: {
                  type: 'array',
                  items: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
                  description: 'HTTP methods to support',
                },
                includeAuth: {
                  type: 'boolean',
                  description: 'Include authentication checks',
                  default: true,
                },
              },
              required: ['endpointName', 'methods'],
            },
          },
          // Code Review Tools
          {
            name: 'review_changes',
            description: 'Review code changes and provide feedback',
            inputSchema: {
              type: 'object',
              properties: {
                filePaths: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Files to review',
                },
                reviewType: {
                  type: 'string',
                  enum: ['security', 'performance', 'maintainability', 'all'],
                  description: 'Type of review to perform',
                  default: 'all',
                },
              },
              required: ['filePaths'],
            },
          },
          {
            name: 'suggest_improvements',
            description: 'Analyze code and suggest specific improvements',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'File to analyze for improvements',
                },
                focus: {
                  type: 'string',
                  enum: ['performance', 'security', 'accessibility', 'maintainability'],
                  description: 'Area to focus improvements on',
                },
              },
              required: ['filePath'],
            },
          },
          // Project Monitoring Tools
          {
            name: 'watch_project',
            description: 'Start watching project for changes and auto-analyze',
            inputSchema: {
              type: 'object',
              properties: {
                watchPaths: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Paths to watch for changes',
                  default: ['src/**/*.ts', 'src/**/*.tsx'],
                },
                autoFix: {
                  type: 'boolean',
                  description: 'Automatically fix issues when detected',
                  default: false,
                },
              },
            },
          },
          {
            name: 'project_health_check',
            description: 'Comprehensive project health and quality assessment',
            inputSchema: {
              type: 'object',
              properties: {
                includeMetrics: {
                  type: 'boolean',
                  description: 'Include code metrics in the report',
                  default: true,
                },
              },
            },
          },
        ] as Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'analyze_code_quality':
            return await this.codeQualityAnalyzer.analyzeCodeQuality(args || {});

          case 'lint_project':
            return await this.codeQualityAnalyzer.lintProject(args || {});

          case 'generate_component':
            return await this.taskAutomator.generateComponent(args || {});

          case 'create_api_endpoint':
            return await this.taskAutomator.createApiEndpoint(args || {});

          case 'review_changes':
            return await this.codeReviewer.reviewChanges(args || {});

          case 'suggest_improvements':
            return await this.codeReviewer.suggestImprovements(args || {});

          case 'watch_project':
            return await this.projectWatcher.startWatching(args || {});

          case 'project_health_check':
            return await this.projectWatcher.healthCheck(args || {});

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('LawMatters MCP Server running on stdio');
  }
}

const server = new LawMattersServerMCP();
server.run().catch(console.error);
