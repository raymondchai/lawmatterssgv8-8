# LawMatters MCP Server

A Model Context Protocol (MCP) server designed to enhance development productivity for the LawMattersSG project through automated code quality analysis, task automation, and intelligent code review.

## Features

### 🔍 Code Quality Analysis
- **Real-time code analysis** with ESLint integration
- **Security vulnerability detection** 
- **Performance optimization suggestions**
- **Maintainability scoring**
- **Automated fixing** of common issues

### 🤖 Task Automation
- **Component generation** with TypeScript and tests
- **API endpoint creation** with Supabase integration
- **Boilerplate code generation**
- **File structure management**

### 👁️ Code Review
- **Automated code review** with severity scoring
- **Security-focused analysis**
- **Performance bottleneck detection**
- **Accessibility compliance checking**
- **Best practices enforcement**

### 📊 Project Monitoring
- **Real-time file watching** with auto-analysis
- **Project health scoring**
- **Dependency management insights**
- **TypeScript configuration validation**

## Installation

1. Install dependencies:
```bash
cd mcp-server
npm install
```

2. Build the server:
```bash
npm run build
```

3. Start the server:
```bash
npm start
```

## Development

For development with auto-reload:
```bash
npm run dev
```

## Available Tools

### Code Quality Tools

#### `analyze_code_quality`
Analyzes code quality for files or directories.

**Parameters:**
- `filePath` (string): Path to analyze
- `rules` (array, optional): Specific rules to check

**Example:**
```json
{
  "filePath": "src/components/auth/LoginForm.tsx",
  "rules": ["security", "performance"]
}
```

#### `lint_project`
Runs comprehensive linting on the entire project.

**Parameters:**
- `fix` (boolean): Auto-fix issues where possible

### Task Automation Tools

#### `generate_component`
Generates React components with TypeScript and tests.

**Parameters:**
- `componentName` (string): Name of the component
- `componentType` (string): "functional" or "class"
- `includeTests` (boolean): Generate test files
- `includeStories` (boolean): Generate Storybook stories

**Example:**
```json
{
  "componentName": "DocumentViewer",
  "componentType": "functional",
  "includeTests": true,
  "includeStories": false
}
```

#### `create_api_endpoint`
Generates API endpoints with Supabase integration.

**Parameters:**
- `endpointName` (string): Name of the endpoint
- `methods` (array): HTTP methods to support
- `includeAuth` (boolean): Include authentication

### Code Review Tools

#### `review_changes`
Reviews code changes and provides feedback.

**Parameters:**
- `filePaths` (array): Files to review
- `reviewType` (string): "security", "performance", "maintainability", or "all"

#### `suggest_improvements`
Analyzes code and suggests specific improvements.

**Parameters:**
- `filePath` (string): File to analyze
- `focus` (string): Area to focus on

### Project Monitoring Tools

#### `watch_project`
Starts watching project for changes and auto-analysis.

**Parameters:**
- `watchPaths` (array): Paths to watch
- `autoFix` (boolean): Auto-fix issues when detected

#### `project_health_check`
Comprehensive project health assessment.

**Parameters:**
- `includeMetrics` (boolean): Include code metrics

## Integration with Claude Desktop

To use this MCP server with Claude Desktop, add the following to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "lawmatters-mcp": {
      "command": "node",
      "args": ["path/to/mcp-server/dist/index.js"],
      "cwd": "path/to/lawmatterssgv8-8"
    }
  }
}
```

## Usage Examples

### Analyze Code Quality
```
Please analyze the code quality of src/components/auth/LoginForm.tsx
```

### Generate a Component
```
Generate a new React component called "DocumentUpload" with tests
```

### Review Code Changes
```
Review the security of these files: src/lib/supabase.ts, src/contexts/AuthContext.tsx
```

### Start Project Monitoring
```
Start watching the project for changes with auto-fix enabled
```

### Health Check
```
Run a comprehensive project health check with metrics
```

## Configuration

The MCP server can be configured through environment variables:

- `MCP_LOG_LEVEL`: Set logging level (debug, info, warn, error)
- `MCP_AUTO_FIX`: Enable auto-fixing by default (true/false)
- `MCP_WATCH_PATHS`: Default paths to watch (comma-separated)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
