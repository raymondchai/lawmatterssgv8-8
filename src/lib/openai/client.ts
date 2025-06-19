/**
 * OpenAI API client configuration and wrapper functions
 */

import { config } from '@/lib/config/env';

export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface EmbeddingRequest {
  input: string | string[];
  model: string;
  user?: string;
}

export interface OpenAIError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

class OpenAIClient {
  private apiKey: string;
  private baseURL: string;
  private organization?: string;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    this.organization = config.organization;
  }

  private async makeRequest(endpoint: string, data: any): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData: OpenAIError = await response.json();
      throw new Error(`OpenAI API Error: ${errorData.error.message}`);
    }

    return response.json();
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<any> {
    return this.makeRequest('/chat/completions', request);
  }

  async createEmbedding(request: EmbeddingRequest): Promise<any> {
    return this.makeRequest('/embeddings', request);
  }

  async createCompletion(prompt: string, options: any = {}): Promise<any> {
    return this.makeRequest('/completions', {
      prompt,
      ...options,
    });
  }
}

// Create singleton instance
let openaiClient: OpenAIClient | null = null;

export function getOpenAIClient(): OpenAIClient {
  if (!openaiClient) {
    if (!config.openai.apiKey) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }
    
    openaiClient = new OpenAIClient({
      apiKey: config.openai.apiKey,
    });
  }
  
  return openaiClient;
}

// Convenience functions
export async function generateChatCompletion(
  messages: ChatMessage[],
  options: Partial<ChatCompletionRequest> = {}
): Promise<string> {
  const client = getOpenAIClient();
  
  const request: ChatCompletionRequest = {
    model: 'gpt-4',
    messages,
    max_tokens: 1000,
    temperature: 0.7,
    ...options,
  };

  const response = await client.createChatCompletion(request);
  return response.choices[0].message.content;
}

export async function generateEmbedding(
  text: string,
  model: string = 'text-embedding-ada-002'
): Promise<number[]> {
  const client = getOpenAIClient();
  
  const response = await client.createEmbedding({
    input: text,
    model,
  });

  return response.data[0].embedding;
}

export async function summarizeText(
  text: string,
  maxLength: number = 500
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a helpful assistant that summarizes text. Provide a concise summary in no more than ${maxLength} characters.`,
    },
    {
      role: 'user',
      content: `Please summarize the following text:\n\n${text}`,
    },
  ];

  return generateChatCompletion(messages, {
    max_tokens: Math.ceil(maxLength / 4), // Rough estimate: 4 chars per token
    temperature: 0.3,
  });
}

export async function extractEntities(
  text: string,
  entityTypes: string[] = ['PERSON', 'ORGANIZATION', 'LOCATION', 'DATE', 'MONEY']
): Promise<any> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an expert at extracting entities from legal documents. Extract the following types of entities: ${entityTypes.join(', ')}. Return the result as a JSON object with entity types as keys and arrays of found entities as values.`,
    },
    {
      role: 'user',
      content: `Extract entities from this text:\n\n${text}`,
    },
  ];

  const response = await generateChatCompletion(messages, {
    temperature: 0.1,
  });

  try {
    return JSON.parse(response);
  } catch (error) {
    console.error('Failed to parse entity extraction response:', error);
    return {};
  }
}

export async function classifyDocument(
  text: string,
  categories: string[] = ['contract', 'legal_brief', 'court_filing', 'agreement', 'other']
): Promise<{ category: string; confidence: number }> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a document classifier specializing in legal documents. Classify the document into one of these categories: ${categories.join(', ')}. Return a JSON object with "category" and "confidence" (0-1) fields.`,
    },
    {
      role: 'user',
      content: `Classify this document:\n\n${text}`,
    },
  ];

  const response = await generateChatCompletion(messages, {
    temperature: 0.1,
  });

  try {
    return JSON.parse(response);
  } catch (error) {
    console.error('Failed to parse classification response:', error);
    return { category: 'other', confidence: 0 };
  }
}

export async function generateLegalTemplate(
  templateType: string,
  description: string,
  jurisdiction: string = 'Singapore'
): Promise<{ content: string; variables: Record<string, any> }> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an expert legal document template generator for ${jurisdiction} law. Generate professional legal document templates with proper structure, clauses, and variable placeholders in the format {{VARIABLE_NAME}}.`,
    },
    {
      role: 'user',
      content: `Generate a ${templateType} template with the following description: ${description}. Include variable placeholders and return as JSON with "content" and "variables" fields.`,
    },
  ];

  const response = await generateChatCompletion(messages, {
    max_tokens: 2000,
    temperature: 0.3,
  });

  try {
    return JSON.parse(response);
  } catch (error) {
    console.error('Failed to parse template generation response:', error);
    return {
      content: response,
      variables: {},
    };
  }
}

export async function answerLegalQuestion(
  question: string,
  context: string = '',
  jurisdiction: string = 'Singapore'
): Promise<string> {
  const systemPrompt = `You are a knowledgeable legal AI assistant specializing in ${jurisdiction} law. Provide helpful, accurate information about legal matters while always reminding users that your responses are for informational purposes only and do not constitute legal advice.

${context ? `Relevant context:\n${context}\n\n` : ''}

Always include a disclaimer that users should consult with qualified legal professionals for specific legal matters.`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: question,
    },
  ];

  return generateChatCompletion(messages, {
    max_tokens: 1000,
    temperature: 0.7,
  });
}

// Error handling utilities
export function isOpenAIError(error: any): error is OpenAIError {
  return error && error.error && typeof error.error.message === 'string';
}

export function handleOpenAIError(error: any): string {
  if (isOpenAIError(error)) {
    return error.error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unknown error occurred while processing your request.';
}
