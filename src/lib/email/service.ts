/**
 * Email service configuration and utilities
 */

import { config } from '@/lib/config/env';

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, any>;
}

export interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<void>;
}

class SendGridProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: Array.isArray(options.to) 
            ? options.to.map(email => ({ email }))
            : [{ email: options.to }],
        }],
        from: { email: this.fromEmail },
        subject: options.subject,
        content: [
          ...(options.html ? [{ type: 'text/html', value: options.html }] : []),
          ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid error: ${error}`);
    }
  }
}

class ResendProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend error: ${error}`);
    }
  }
}

// Email templates
export const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Welcome to LawMattersSG',
    html: `
      <h1>Welcome to LawMattersSG!</h1>
      <p>Thank you for joining our AI-powered legal document platform.</p>
      <p>You can now:</p>
      <ul>
        <li>Upload and analyze legal documents</li>
        <li>Chat with AI about your documents</li>
        <li>Generate legal templates</li>
        <li>Access our law firm directory</li>
      </ul>
      <p>Get started by uploading your first document!</p>
      <p>Best regards,<br>The LawMattersSG Team</p>
    `,
  },
  documentProcessed: {
    subject: 'Document Processing Complete',
    html: `
      <h1>Document Processing Complete</h1>
      <p>Your document "{{filename}}" has been successfully processed.</p>
      <p>Processing results:</p>
      <ul>
        <li>Text extraction: {{hasText}}</li>
        <li>AI analysis: {{hasAnalysis}}</li>
        <li>Document classification: {{documentType}}</li>
      </ul>
      <p>You can now ask questions about this document using our AI chat feature.</p>
      <p><a href="{{documentUrl}}">View Document</a></p>
    `,
  },
  usageLimitWarning: {
    subject: 'Usage Limit Warning',
    html: `
      <h1>Usage Limit Warning</h1>
      <p>You're approaching your usage limit for {{operation}}.</p>
      <p>Current usage: {{used}} / {{limit}}</p>
      <p>Consider upgrading your subscription to continue using our AI features.</p>
      <p><a href="{{upgradeUrl}}">Upgrade Now</a></p>
    `,
  },
  passwordReset: {
    subject: 'Reset Your Password',
    html: `
      <h1>Reset Your Password</h1>
      <p>You requested to reset your password for LawMattersSG.</p>
      <p>Click the link below to reset your password:</p>
      <p><a href="{{resetUrl}}">Reset Password</a></p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  },
};

class EmailService {
  private provider: EmailProvider | null = null;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider() {
    if (config.email.sendgridApiKey) {
      this.provider = new SendGridProvider(
        config.email.sendgridApiKey,
        config.email.fromEmail
      );
    } else if (config.email.resendApiKey) {
      this.provider = new ResendProvider(
        config.email.resendApiKey,
        config.email.fromEmail
      );
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.provider) {
      console.warn('No email provider configured');
      return;
    }

    try {
      await this.provider.sendEmail(options);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendTemplate(
    templateName: keyof typeof EMAIL_TEMPLATES,
    to: string | string[],
    data: Record<string, any> = {}
  ): Promise<void> {
    const template = EMAIL_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    const subject = this.interpolateTemplate(template.subject, data);
    const html = this.interpolateTemplate(template.html, data);

    await this.sendEmail({
      to,
      subject,
      html,
    });
  }

  private interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  async sendWelcomeEmail(email: string): Promise<void> {
    await this.sendTemplate('welcome', email);
  }

  async sendDocumentProcessedEmail(
    email: string,
    filename: string,
    documentType: string,
    documentUrl: string
  ): Promise<void> {
    await this.sendTemplate('documentProcessed', email, {
      filename,
      hasText: 'Complete',
      hasAnalysis: 'Complete',
      documentType,
      documentUrl,
    });
  }

  async sendUsageLimitWarning(
    email: string,
    operation: string,
    used: number,
    limit: number,
    upgradeUrl: string
  ): Promise<void> {
    await this.sendTemplate('usageLimitWarning', email, {
      operation,
      used,
      limit,
      upgradeUrl,
    });
  }

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    await this.sendTemplate('passwordReset', email, {
      resetUrl,
    });
  }

  isConfigured(): boolean {
    return this.provider !== null;
  }
}

// Export singleton instance
export const emailService = new EmailService();
