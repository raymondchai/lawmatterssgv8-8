# LawMattersSG Test Generation Guide

## Using Playwright MCP to Generate Tests

### Prerequisites
1. VS Code with GitHub Copilot extension
2. MCP configuration in `.vscode/mcp.json`
3. Test generation prompt in `.github/generate_tests.prompt.md`

### How to Generate Tests

1. **Open VS Code Agent Mode** (Ctrl+Shift+P → "GitHub Copilot: Open Agent Mode")

2. **Add the prompt to context**:
   - Include `.github/generate_tests.prompt.md` in your chat context

3. **Start test generation** with one of these commands:

#### For Production Site Testing:
```
Explore https://craftchatbot.com/
```

#### For Local Development Testing:
```
Explore http://localhost:5173/
```

#### For Specific Feature Testing:
```
Explore https://craftchatbot.com/ and focus on the law firm directory search functionality
```

```
Explore https://craftchatbot.com/ and test the document analysis upload feature
```

```
Explore https://craftchatbot.com/ and verify the authentication flow (login/signup)
```

### What the MCP Will Do:

1. **Navigate** to your LawMattersSG site
2. **Explore** key functionalities automatically
3. **Discover** user journeys and edge cases
4. **Generate** TypeScript Playwright tests
5. **Execute** tests and iterate until they pass
6. **Save** tests in the `tests/mcp-generated/` directory

### Expected Test Coverage:

- ✅ **Navigation and UI Elements**
- ✅ **Authentication Flow** (Login/SignUp buttons)
- ✅ **Law Firm Directory** (Search, Filter, Details)
- ✅ **Document Analysis** (Upload, Processing)
- ✅ **Legal Q&A** (Questions, Answers)
- ✅ **Template Marketplace** (Browse, Download)
- ✅ **Responsive Design** (Mobile/Desktop)
- ✅ **Error Handling** (Network errors, validation)

### Benefits:

- 🔍 **Discovers bugs** you might miss in manual testing
- ⚡ **Saves time** writing boilerplate test code
- 🎯 **Tests real user journeys** based on actual site exploration
- 🔄 **Iterates automatically** until tests pass
- 📊 **Provides comprehensive coverage** ideas

### Tips:

- Start with broad exploration, then get specific
- Let the agent run multiple exploration sessions for different features
- Review and refine generated tests before committing
- Use different AI models (Claude, GPT-4) for varied approaches
