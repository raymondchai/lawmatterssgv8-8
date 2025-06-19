import OpenAI from 'openai';
import { config } from '@/lib/config/env';

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  dangerouslyAllowBrowser: true, // Only for development - in production, use server-side
});

// Types for OpenAI responses
export interface DocumentAnalysis {
  summary: string;
  keyEntities: string[];
  documentType: string;
  legalImplications: string[];
  recommendedActions: string[];
  confidence: number;
}

export interface ChatResponse {
  message: string;
  sources: string[];
  confidence: number;
}

export interface EmbeddingResponse {
  embedding: number[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Analyze a legal document using OpenAI
 */
export async function analyzeDocument(text: string): Promise<DocumentAnalysis> {
  if (!config.openai.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `
    Analyze this legal document and provide a structured analysis in JSON format:
    
    1. Executive summary (2-3 sentences)
    2. Key entities (people, organizations, dates, amounts)
    3. Document classification (contract, agreement, legal notice, etc.)
    4. Legal implications (potential risks, obligations, rights)
    5. Recommended actions (what the reader should do)
    6. Confidence score (0-1, how confident you are in this analysis)
    
    Document text:
    ${text.substring(0, 8000)} ${text.length > 8000 ? '...' : ''}
    
    Respond with valid JSON only, no additional text.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: 'You are a legal AI assistant specializing in Singapore law. Provide accurate, helpful analysis of legal documents.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: config.openai.maxTokens,
      temperature: config.openai.temperature,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const analysis = JSON.parse(content);
    
    return {
      summary: analysis.summary || '',
      keyEntities: analysis.keyEntities || [],
      documentType: analysis.documentType || 'Unknown',
      legalImplications: analysis.legalImplications || [],
      recommendedActions: analysis.recommendedActions || [],
      confidence: analysis.confidence || 0.5,
    };
  } catch (error) {
    console.error('Error analyzing document:', error);
    throw new Error('Failed to analyze document');
  }
}

/**
 * Generate embeddings for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResponse> {
  if (!config.openai.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000), // Limit text length
    });

    return {
      embedding: response.data[0].embedding,
      usage: response.usage,
    };
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Chat with AI about legal topics with context
 */
export async function chatWithAI(
  question: string,
  context: string[] = [],
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<ChatResponse> {
  if (!config.openai.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const contextText = context.length > 0 
    ? `\n\nRelevant context from your documents:\n${context.join('\n\n')}`
    : '';

  const systemMessage = `You are a legal AI assistant specializing in Singapore law. 
    Provide helpful, accurate legal information while being clear that this is not legal advice.
    Always recommend consulting with a qualified lawyer for specific legal matters.
    If you reference information from the user's documents, mention that clearly.`;

  const messages = [
    { role: 'system' as const, content: systemMessage },
    ...conversationHistory,
    { 
      role: 'user' as const, 
      content: `${question}${contextText}` 
    }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages,
      max_tokens: config.openai.maxTokens,
      temperature: 0.2, // Lower temperature for more consistent legal advice
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return {
      message: content,
      sources: context.length > 0 ? ['Your uploaded documents'] : [],
      confidence: 0.8, // Default confidence for chat responses
    };
  } catch (error) {
    console.error('Error in AI chat:', error);
    throw new Error('Failed to get AI response');
  }
}

/**
 * Summarize a document
 */
export async function summarizeDocument(text: string, maxLength: number = 500): Promise<string> {
  if (!config.openai.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `
    Provide a concise summary of this legal document in approximately ${maxLength} characters.
    Focus on the key points, parties involved, main obligations, and important dates.
    
    Document text:
    ${text.substring(0, 8000)} ${text.length > 8000 ? '...' : ''}
  `;

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: 'You are a legal AI assistant. Provide clear, concise summaries of legal documents.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: Math.min(config.openai.maxTokens, 1000),
      temperature: config.openai.temperature,
    });

    return response.choices[0]?.message?.content || 'Unable to generate summary';
  } catch (error) {
    console.error('Error summarizing document:', error);
    throw new Error('Failed to summarize document');
  }
}

/**
 * Extract entities from a document
 */
export async function extractEntities(text: string): Promise<{
  people: string[];
  organizations: string[];
  dates: string[];
  amounts: string[];
  locations: string[];
}> {
  if (!config.openai.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `
    Extract key entities from this legal document and return them in JSON format:
    
    {
      "people": ["names of people"],
      "organizations": ["company names, law firms, etc."],
      "dates": ["important dates"],
      "amounts": ["monetary amounts, percentages"],
      "locations": ["addresses, jurisdictions"]
    }
    
    Document text:
    ${text.substring(0, 8000)} ${text.length > 8000 ? '...' : ''}
    
    Respond with valid JSON only.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: 'You are a legal AI assistant. Extract entities accurately from legal documents.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.1, // Very low temperature for consistent entity extraction
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const entities = JSON.parse(content);
    
    return {
      people: entities.people || [],
      organizations: entities.organizations || [],
      dates: entities.dates || [],
      amounts: entities.amounts || [],
      locations: entities.locations || [],
    };
  } catch (error) {
    console.error('Error extracting entities:', error);
    return {
      people: [],
      organizations: [],
      dates: [],
      amounts: [],
      locations: [],
    };
  }
}
