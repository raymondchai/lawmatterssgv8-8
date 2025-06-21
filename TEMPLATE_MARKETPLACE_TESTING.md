# Template Marketplace Testing Documentation

## Overview

This document outlines the comprehensive testing strategy implemented for the LawMattersSG Template Marketplace features. The testing suite covers unit tests, integration tests, component tests, and end-to-end tests to ensure robust functionality and user experience.

## Testing Structure

### 1. Unit Tests

#### Service Tests
- **Location**: `src/__tests__/services/`
- **Coverage**: Core business logic and API interactions

**templateMarketplace.test.ts**
- Template search and filtering
- Template retrieval by slug
- Customization creation and management
- Download tracking
- Rating and review functionality
- Analytics event tracking
- Error handling

**templateAnalytics.test.ts**
- Dashboard analytics data aggregation
- Template performance metrics
- Revenue analytics calculations
- User engagement metrics
- Private helper method validation

#### Component Tests
- **Location**: `src/__tests__/components/`
- **Coverage**: React component behavior and user interactions

**TemplateBrowser.test.tsx**
- Template listing and display
- Search functionality
- Category and access level filtering
- Sorting options
- Load more functionality
- View mode toggles
- Error state handling
- Analytics tracking integration

### 2. Integration Tests

#### Template Marketplace Workflow
- **Location**: `src/__tests__/integration/`
- **Coverage**: Complete user workflows and feature interactions

**templateMarketplace.test.ts**
- Template discovery and selection flow
- Template preview functionality
- Template customization workflow
- Document generation and download
- Field validation and error handling
- Analytics integration throughout user journey

### 3. End-to-End Tests

#### Complete User Scenarios
- **Location**: `tests/e2e/`
- **Coverage**: Real browser interactions and full application workflows

**templateMarketplace.spec.ts**
- Template browsing and search
- Category and access level filtering
- Template sorting functionality
- Template preview navigation
- Template customization with validation
- Document generation and download
- Rating and review system
- Version management (admin features)
- Load more functionality
- Responsive design testing
- Error state handling
- Analytics event tracking

## Test Configuration

### Vitest Configuration
- **File**: `vitest.config.ts`
- **Environment**: jsdom for React component testing
- **Setup**: `src/test/setup.ts`
- **Coverage**: 80% threshold for branches, functions, lines, and statements

### Playwright Configuration
- **File**: `playwright.config.ts`
- **Browsers**: Chromium, Firefox, WebKit
- **Global Setup**: `tests/e2e/global-setup.ts`
- **Global Teardown**: `tests/e2e/global-teardown.ts`

## Running Tests

### All Template Marketplace Tests
```bash
npm run test:templates
```

### Watch Mode for Development
```bash
npm run test:templates:watch
```

### End-to-End Tests Only
```bash
npm run test:e2e:templates
```

### Full Test Suite
```bash
npm run test:all
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Data and Mocking

### Mock Data
- **Templates**: Comprehensive mock templates with various access levels, categories, and field types
- **Users**: Mock user data for authentication testing
- **Categories**: Mock category data for filtering tests
- **Analytics**: Mock analytics data for dashboard testing

### Service Mocking
- **Supabase**: Complete mocking of database operations
- **Template Services**: Mocked for isolated component testing
- **Authentication**: Mocked user sessions and permissions

## Key Testing Scenarios

### 1. Template Discovery
- ✅ Browse templates with pagination
- ✅ Search templates by keywords
- ✅ Filter by category, access level, and rating
- ✅ Sort by popularity, rating, and date
- ✅ View template details and metadata

### 2. Template Customization
- ✅ Dynamic form generation based on template fields
- ✅ Field validation (required, length, format)
- ✅ Live preview updates
- ✅ Save and restore customization progress
- ✅ Error handling for invalid inputs

### 3. Document Generation
- ✅ Generate documents in multiple formats (PDF, DOCX, HTML)
- ✅ Download tracking and analytics
- ✅ Error handling for generation failures
- ✅ File size and format validation

### 4. User Interactions
- ✅ Template rating and review submission
- ✅ Version management (for authorized users)
- ✅ Analytics event tracking
- ✅ Responsive design across devices

### 5. Error Handling
- ✅ Network error recovery
- ✅ Invalid template handling
- ✅ Permission denied scenarios
- ✅ Validation error display

## Analytics Testing

### Event Tracking
- Template view events
- Customization start events
- Preview generation events
- Download completion events
- Rating submission events

### Data Validation
- Event structure validation
- User journey tracking
- Performance metrics calculation
- Revenue analytics accuracy

## Performance Testing

### Load Testing Scenarios
- Template search with large datasets
- Concurrent customization sessions
- Document generation under load
- Analytics dashboard performance

### Metrics Monitored
- Page load times
- Search response times
- Document generation times
- Memory usage during operations

## Security Testing

### Access Control
- Template access level enforcement
- User permission validation
- Session management
- Data isolation between users

### Input Validation
- XSS prevention in template content
- SQL injection prevention
- File upload security
- Rate limiting compliance

## Continuous Integration

### GitHub Actions
- Automated test execution on pull requests
- Coverage reporting
- E2E test execution in CI environment
- Performance regression detection

### Quality Gates
- Minimum 80% test coverage
- All tests must pass before merge
- E2E tests must pass in staging environment
- Performance benchmarks must be met

## Maintenance and Updates

### Test Maintenance
- Regular review of test coverage
- Update tests when features change
- Remove obsolete tests
- Add tests for new features

### Mock Data Updates
- Keep mock data synchronized with production schemas
- Update test scenarios based on user feedback
- Maintain realistic test data volumes

## Troubleshooting

### Common Issues
1. **Flaky E2E Tests**: Use proper wait conditions and stable selectors
2. **Mock Inconsistencies**: Ensure mocks match actual API responses
3. **Coverage Gaps**: Identify untested code paths and add appropriate tests
4. **Performance Issues**: Monitor test execution times and optimize slow tests

### Debug Commands
```bash
# Debug specific test
npm run test:e2e:debug

# Run tests with UI
npm run test:ui

# Run E2E tests in headed mode
npm run test:e2e:headed
```

## Future Enhancements

### Planned Improvements
- Visual regression testing for UI components
- API contract testing with Pact
- Load testing with realistic user scenarios
- Accessibility testing automation
- Cross-browser compatibility testing

### Monitoring Integration
- Real-time test result monitoring
- Performance trend analysis
- Error rate tracking
- User experience metrics correlation

This comprehensive testing strategy ensures the Template Marketplace features are robust, reliable, and provide an excellent user experience while maintaining high code quality and performance standards.
