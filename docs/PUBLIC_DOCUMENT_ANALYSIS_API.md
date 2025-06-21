# Public Document Analysis API Documentation

## Overview

The Public Document Analysis API allows users to analyze legal documents without authentication. This feature provides basic document analysis capabilities with rate limiting to prevent abuse while encouraging users to upgrade to premium plans.

## Base URL

```
https://your-project.supabase.co/functions/v1
```

## Authentication

No authentication is required for public document analysis endpoints. However, rate limiting is enforced based on IP address.

## Rate Limits

- **Hourly Limit**: 3 documents per hour per IP address
- **Daily Limit**: 10 documents per day per IP address
- **File Size Limit**: 10MB per file
- **Session Duration**: 1 hour
- **Storage Retention**: 24 hours (documents automatically deleted)

## Supported File Types

- PDF (`application/pdf`)
- JPEG (`image/jpeg`)
- PNG (`image/png`)
- WebP (`image/webp`)

## API Endpoints

### 1. Check Rate Limit

Check the current rate limit status for an IP address.

**Endpoint**: `POST /public-rate-limiter`

**Request Body**:
```json
{
  "ipAddress": "192.168.1.1",
  "action": "check"
}
```

**Response**:
```json
{
  "allowed": true,
  "remaining": {
    "hourly": 2,
    "daily": 8
  },
  "resetTime": {
    "hourly": "2024-01-01T15:00:00.000Z",
    "daily": "2024-01-02T00:00:00.000Z"
  },
  "message": null
}
```

**Error Response** (Rate Limit Exceeded):
```json
{
  "allowed": false,
  "remaining": {
    "hourly": 0,
    "daily": 5
  },
  "resetTime": {
    "hourly": "2024-01-01T15:00:00.000Z",
    "daily": "2024-01-02T00:00:00.000Z"
  },
  "message": "Hourly limit exceeded. Please try again in an hour."
}
```

### 2. Analyze Document

Analyze a document and get basic insights.

**Endpoint**: `POST /public-document-analysis`

**Request Body**:
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "ipAddress": "192.168.1.1",
  "filename": "contract.pdf",
  "fileSize": 1048576,
  "fileType": "application/pdf",
  "fileContent": "base64-encoded-file-content"
}
```

**Response**:
```json
{
  "success": true,
  "analysisId": "123e4567-e89b-12d3-a456-426614174000",
  "result": {
    "summary": "This document appears to be an employment contract outlining terms and conditions...",
    "keyWords": ["employment", "salary", "benefits", "termination", "probation"],
    "textLength": 2500,
    "ocrQuality": 0.95,
    "documentType": "Contract/Agreement"
  }
}
```

**Error Responses**:

Rate Limit Exceeded (429):
```json
{
  "error": "Rate limit exceeded",
  "details": "You have reached your hourly limit of 3 documents."
}
```

Invalid Session (401):
```json
{
  "error": "Invalid or expired session"
}
```

File Too Large (400):
```json
{
  "error": "File size exceeds limit of 10MB"
}
```

Unsupported File Type (400):
```json
{
  "error": "File type application/msword is not supported. Allowed types: PDF, JPEG, PNG, WebP"
}
```

### 3. Cleanup Expired Data

Administrative endpoint to clean up expired sessions and documents.

**Endpoint**: `POST /cleanup-public-data`

**Request Body**: None

**Response**:
```json
{
  "success": true,
  "stats": {
    "deletedAnalyses": 15,
    "deletedSessions": 8,
    "deletedFiles": 23,
    "errors": []
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Database Schema

### Public Analysis Sessions

```sql
CREATE TABLE public_analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  user_agent TEXT,
  documents_analyzed INTEGER DEFAULT 0,
  total_storage_used BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Public Document Analyses

```sql
CREATE TABLE public_document_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public_analysis_sessions(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  analysis_result JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Analytics Events

```sql
CREATE TABLE public_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  session_id UUID,
  ip_address INET,
  user_agent TEXT,
  page_url TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Client-Side Integration

### JavaScript/TypeScript Example

```typescript
class PublicDocumentAnalyzer {
  private baseUrl = 'https://your-project.supabase.co/functions/v1';
  
  async checkRateLimit(ipAddress: string): Promise<RateLimitStatus> {
    const response = await fetch(`${this.baseUrl}/public-rate-limiter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ipAddress,
        action: 'check'
      })
    });
    
    return response.json();
  }
  
  async analyzeDocument(file: File, sessionId: string, ipAddress: string): Promise<AnalysisResult> {
    // Convert file to base64
    const fileContent = await this.fileToBase64(file);
    
    const response = await fetch(`${this.baseUrl}/public-document-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        ipAddress,
        filename: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileContent
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Analysis failed');
    }
    
    return response.json();
  }
  
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
```

### React Hook Example

```typescript
import { useState, useCallback } from 'react';

export function usePublicDocumentAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const analyzeDocument = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const analyzer = new PublicDocumentAnalyzer();
      const ipAddress = await getClientIP();
      const sessionId = generateSessionId();
      
      // Check rate limits
      const rateLimit = await analyzer.checkRateLimit(ipAddress);
      if (!rateLimit.allowed) {
        throw new Error(rateLimit.message);
      }
      
      // Analyze document
      const result = await analyzer.analyzeDocument(file, sessionId, ipAddress);
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);
  
  return { analyzeDocument, isAnalyzing, error };
}
```

## Error Handling

### Common Error Codes

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | Bad Request | Invalid request parameters or file validation failed |
| 401 | Unauthorized | Invalid or expired session |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side processing error |

### Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

## Security Considerations

1. **Rate Limiting**: Enforced at IP level to prevent abuse
2. **File Validation**: Only allowed file types and sizes are accepted
3. **Data Retention**: Documents are automatically deleted after 24 hours
4. **Session Management**: Sessions expire after 1 hour of inactivity
5. **Input Sanitization**: All inputs are validated and sanitized
6. **CORS**: Properly configured for web applications

## Analytics and Monitoring

The API automatically tracks:

- Document upload events
- Analysis completion events
- Rate limit violations
- Error occurrences
- Session duration and behavior
- Conversion events (registration, subscription)

## Deployment

### Environment Variables

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Supabase Functions Deployment

```bash
# Deploy rate limiter function
supabase functions deploy public-rate-limiter

# Deploy document analysis function
supabase functions deploy public-document-analysis

# Deploy cleanup function
supabase functions deploy cleanup-public-data
```

### Database Setup

```bash
# Run migrations
supabase db push

# Or apply specific migrations
supabase migration up --include-all
```

## Testing

### Unit Tests

```typescript
describe('Public Document Analysis API', () => {
  test('should check rate limits correctly', async () => {
    const response = await checkRateLimit('127.0.0.1');
    expect(response.allowed).toBe(true);
    expect(response.remaining.hourly).toBeLessThanOrEqual(3);
  });
  
  test('should analyze PDF document', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const result = await analyzeDocument(file, 'session-id', '127.0.0.1');
    expect(result.success).toBe(true);
    expect(result.analysisId).toBeDefined();
  });
});
```

### Integration Tests

```bash
# Test rate limiting
curl -X POST https://your-project.supabase.co/functions/v1/public-rate-limiter \
  -H "Content-Type: application/json" \
  -d '{"ipAddress": "127.0.0.1", "action": "check"}'

# Test document analysis (with base64 file content)
curl -X POST https://your-project.supabase.co/functions/v1/public-document-analysis \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-session", "ipAddress": "127.0.0.1", "filename": "test.pdf", "fileSize": 1024, "fileType": "application/pdf", "fileContent": "base64-content"}'
```

## Support and Troubleshooting

### Common Issues

1. **Rate Limit Exceeded**: Wait for the reset time or encourage user registration
2. **File Too Large**: Compress file or split into smaller parts
3. **Unsupported File Type**: Convert to supported format
4. **Session Expired**: Create new session and retry
5. **Analysis Failed**: Check file integrity and try again

### Monitoring

Monitor these metrics:
- API response times
- Error rates by endpoint
- Rate limit hit frequency
- Storage usage
- Conversion rates

### Logs

Check Supabase function logs for detailed error information:

```bash
supabase functions logs public-document-analysis
supabase functions logs public-rate-limiter
```

## Changelog

### Version 1.0.0 (Initial Release)
- Basic document analysis for PDF and image files
- Rate limiting by IP address
- Session-based storage management
- Analytics tracking
- Automatic cleanup of expired data

### Roadmap

#### Version 1.1.0 (Planned)
- Enhanced OCR accuracy
- Support for additional file formats (DOCX, TXT)
- Batch document analysis
- Webhook notifications

#### Version 1.2.0 (Planned)
- Advanced legal insights for premium users
- Document comparison features
- API key authentication for developers
- Enhanced analytics dashboard

## License

This API is part of the LawMattersSG platform. Usage is subject to the platform's terms of service and privacy policy.

## Contact

For API support and questions:
- Email: api-support@lawmatterssg.com
- Documentation: https://docs.lawmatterssg.com
- Status Page: https://status.lawmatterssg.com
