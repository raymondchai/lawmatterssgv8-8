/**
 * Cron job configuration for Supabase Edge Functions
 * 
 * This file defines the cron schedules for various maintenance tasks.
 * These can be set up using GitHub Actions, Vercel Cron, or other cron services.
 */

export const CRON_SCHEDULES = {
  // Clean up expired public document analysis data every hour
  CLEANUP_PUBLIC_DATA: {
    schedule: '0 * * * *', // Every hour at minute 0
    function: 'cleanup-public-data',
    description: 'Clean up expired public document analyses and storage files',
    enabled: true
  },

  // Generate usage reports daily at 2 AM
  USAGE_REPORTS: {
    schedule: '0 2 * * *', // Daily at 2:00 AM
    function: 'generate-usage-reports',
    description: 'Generate daily usage reports for public document analysis',
    enabled: false // Enable when usage reporting is implemented
  },

  // Health check every 15 minutes
  HEALTH_CHECK: {
    schedule: '*/15 * * * *', // Every 15 minutes
    function: 'health-check',
    description: 'Perform health checks on public analysis services',
    enabled: false // Enable when health check function is implemented
  },

  // Rate limit reset (if needed for custom rate limiting)
  RATE_LIMIT_RESET: {
    schedule: '0 0 * * *', // Daily at midnight
    function: 'reset-rate-limits',
    description: 'Reset daily rate limits for public users',
    enabled: false // Only needed if using custom rate limiting
  }
} as const;

/**
 * GitHub Actions workflow configuration for cron jobs
 */
export const GITHUB_ACTIONS_WORKFLOW = `
name: Supabase Cron Jobs

on:
  schedule:
    # Clean up expired data every hour
    - cron: '0 * * * *'
    # Generate reports daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual triggering

jobs:
  cleanup-public-data:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 * * * *' || github.event_name == 'workflow_dispatch'
    steps:
      - name: Cleanup Expired Public Data
        run: |
          curl -X POST \\
            -H "Authorization: Bearer \${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \\
            -H "Content-Type: application/json" \\
            "\${{ secrets.SUPABASE_URL }}/functions/v1/cleanup-public-data"

  generate-reports:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 2 * * *' || github.event_name == 'workflow_dispatch'
    steps:
      - name: Generate Usage Reports
        run: |
          curl -X POST \\
            -H "Authorization: Bearer \${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \\
            -H "Content-Type: application/json" \\
            "\${{ secrets.SUPABASE_URL }}/functions/v1/generate-usage-reports"
`;

/**
 * Vercel cron configuration (vercel.json)
 */
export const VERCEL_CRON_CONFIG = {
  crons: [
    {
      path: '/api/cron/cleanup-public-data',
      schedule: '0 * * * *' // Every hour
    },
    {
      path: '/api/cron/generate-reports',
      schedule: '0 2 * * *' // Daily at 2 AM
    }
  ]
};

/**
 * Example API route for Vercel cron (/api/cron/cleanup-public-data.ts)
 */
export const VERCEL_CLEANUP_API = `
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // Verify this is a cron request
  if (req.headers.authorization !== \`Bearer \${process.env.CRON_SECRET}\`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.functions.invoke('cleanup-public-data');

    if (error) {
      console.error('Cleanup failed:', error);
      return res.status(500).json({ error: 'Cleanup failed' });
    }

    console.log('Cleanup completed:', data);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
`;

/**
 * Docker-based cron setup (for self-hosted solutions)
 */
export const DOCKER_CRON_SETUP = `
# Dockerfile.cron
FROM node:18-alpine

WORKDIR /app

# Install curl for making HTTP requests
RUN apk add --no-cache curl

# Copy cron scripts
COPY cron-scripts/ ./cron-scripts/
COPY package.json ./
RUN npm install

# Install cron
RUN apk add --no-cache dcron

# Copy crontab file
COPY crontab /etc/crontabs/root

# Make scripts executable
RUN chmod +x ./cron-scripts/*.sh

# Start cron daemon
CMD ["crond", "-f", "-d", "8"]

# crontab file:
# Clean up expired data every hour
0 * * * * /app/cron-scripts/cleanup-public-data.sh

# Generate reports daily at 2 AM
0 2 * * * /app/cron-scripts/generate-reports.sh
`;

/**
 * Monitoring and alerting configuration
 */
export const MONITORING_CONFIG = {
  // Slack webhook for notifications
  slack: {
    webhook: process.env.SLACK_WEBHOOK_URL,
    channels: {
      alerts: '#alerts',
      reports: '#reports'
    }
  },

  // Email notifications
  email: {
    from: 'noreply@lawmatterssg.com',
    to: ['admin@lawmatterssg.com'],
    smtp: {
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }
  },

  // Thresholds for alerts
  thresholds: {
    storageUsage: 0.8, // Alert when 80% of storage is used
    errorRate: 0.05, // Alert when error rate exceeds 5%
    responseTime: 5000, // Alert when response time exceeds 5 seconds
    failedCleanups: 3 // Alert after 3 consecutive failed cleanups
  }
};

/**
 * Health check configuration
 */
export const HEALTH_CHECK_CONFIG = {
  endpoints: [
    {
      name: 'Public Rate Limiter',
      url: '/functions/v1/public-rate-limiter',
      method: 'POST',
      body: { ipAddress: '127.0.0.1', action: 'check' },
      expectedStatus: 200,
      timeout: 10000
    },
    {
      name: 'Public Document Analysis',
      url: '/functions/v1/public-document-analysis',
      method: 'OPTIONS', // CORS preflight
      expectedStatus: 200,
      timeout: 5000
    },
    {
      name: 'Cleanup Function',
      url: '/functions/v1/cleanup-public-data',
      method: 'OPTIONS', // CORS preflight
      expectedStatus: 200,
      timeout: 5000
    }
  ],

  database: {
    tables: [
      'public_analysis_sessions',
      'public_document_analyses'
    ],
    checks: [
      'SELECT COUNT(*) FROM public_analysis_sessions WHERE expires_at > NOW()',
      'SELECT COUNT(*) FROM public_document_analyses WHERE expires_at > NOW()'
    ]
  },

  storage: {
    buckets: ['public-documents'],
    checks: [
      'List bucket contents',
      'Check bucket permissions'
    ]
  }
};

/**
 * Usage reporting configuration
 */
export const USAGE_REPORTING_CONFIG = {
  metrics: [
    'total_sessions_created',
    'total_documents_analyzed',
    'total_storage_used',
    'average_session_duration',
    'conversion_rate_to_registered_users',
    'most_common_document_types',
    'peak_usage_hours',
    'error_rates_by_type'
  ],

  retention: {
    daily: 90, // Keep daily reports for 90 days
    weekly: 52, // Keep weekly reports for 52 weeks
    monthly: 24 // Keep monthly reports for 24 months
  },

  export: {
    formats: ['json', 'csv', 'pdf'],
    destinations: ['database', 's3', 'email']
  }
};
