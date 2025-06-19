import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CORS_HEADERS, USAGE_LIMITS, ERROR_MESSAGES, OperationType, SubscriptionTier } from './config.ts'

export function createSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

export function createCorsResponse(data: any, status: number = 200) {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    }
  )
}

export function createErrorResponse(message: string, status: number = 400) {
  return createCorsResponse({ error: message }, status)
}

export async function authenticateUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new Error(ERROR_MESSAGES.unauthorized)
  }

  const token = authHeader.replace('Bearer ', '')
  const supabaseClient = createSupabaseClient()
  
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

  if (authError || !user) {
    throw new Error(ERROR_MESSAGES.unauthorized)
  }

  return { user, supabaseClient }
}

export async function checkUsageLimit(
  userId: string, 
  operation: OperationType, 
  supabaseClient: any
): Promise<{ allowed: boolean; limit: number; used: number }> {
  // Get user's subscription tier
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single()

  const tier = (profile?.subscription_tier || 'free') as SubscriptionTier
  const limits = USAGE_LIMITS[tier]
  
  // Map operation to limit category
  const operationLimits = getOperationLimits(operation, limits)
  
  if (!operationLimits) {
    return { allowed: true, limit: 999999, used: 0 }
  }

  // Check today's usage
  const today = new Date().toISOString().split('T')[0]
  const { data: todayUsage } = await supabaseClient
    .from('ai_usage_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('operation', operation)
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lt('created_at', `${today}T23:59:59.999Z`)

  const todayCount = todayUsage?.length || 0

  return {
    allowed: todayCount < operationLimits.daily,
    limit: operationLimits.daily,
    used: todayCount
  }
}

function getOperationLimits(operation: OperationType, limits: any) {
  switch (operation) {
    case 'ai_chat':
      return limits.aiChat
    case 'document_analysis':
    case 'document_summarize':
    case 'document_extract':
      return limits.documentAnalysis
    case 'template_generation':
      return limits.templateGeneration
    case 'document_upload':
      return limits.documentUpload
    default:
      return null
  }
}

export async function logUsage(
  userId: string, 
  operation: OperationType, 
  supabaseClient: any,
  metadata?: Record<string, any>
) {
  await supabaseClient
    .from('ai_usage_logs')
    .insert({
      user_id: userId,
      operation: operation,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    })
}

export async function callOpenAI(
  endpoint: string,
  payload: any,
  apiKey?: string
): Promise<any> {
  const openaiApiKey = apiKey || Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    throw new Error(ERROR_MESSAGES.openaiNotConfigured)
  }

  const response = await fetch(`https://api.openai.com/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`OpenAI API error: ${response.statusText} - ${JSON.stringify(errorData)}`)
  }

  return await response.json()
}

export async function generateEmbedding(text: string, apiKey?: string): Promise<number[]> {
  const response = await callOpenAI('embeddings', {
    input: text,
    model: 'text-embedding-ada-002',
  }, apiKey)

  return response.data[0].embedding
}

export async function generateChatCompletion(
  messages: any[],
  model: string = 'gpt-4',
  maxTokens: number = 1000,
  temperature: number = 0.7,
  apiKey?: string
): Promise<string> {
  const response = await callOpenAI('chat/completions', {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  }, apiKey)

  return response.choices[0].message.content
}

export function validateRequiredFields(data: any, requiredFields: string[]): void {
  const missingFields = requiredFields.filter(field => !data[field])
  if (missingFields.length > 0) {
    throw new Error(`${ERROR_MESSAGES.missingFields}: ${missingFields.join(', ')}`)
  }
}

export function generateId(prefix: string = ''): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`
}

export async function getDocumentContext(
  documentIds: string[],
  query: string,
  supabaseClient: any,
  apiKey?: string
): Promise<string> {
  if (!documentIds.length) {
    return ''
  }

  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query, apiKey)

    // Find similar document chunks
    const { data: similarChunks } = await supabaseClient.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 5,
      document_ids: documentIds
    })

    if (!similarChunks || similarChunks.length === 0) {
      return ''
    }

    // Combine relevant text chunks
    const context = similarChunks
      .map((chunk: any) => chunk.content)
      .filter(Boolean)
      .join('\n\n')

    return context
  } catch (error) {
    console.error('Error getting document context:', error)
    return ''
  }
}
