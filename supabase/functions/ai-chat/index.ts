import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatRequest {
  message: string;
  conversationId?: string;
  documentIds?: string[];
  useRAG?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { message, conversationId, documentIds = [], useRAG = false }: ChatRequest = await req.json()

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check usage limits
    const usageCheck = await checkUsageLimit(user.id, 'ai_chat', supabaseClient);
    if (!usageCheck.allowed) {
      return new Response(
        JSON.stringify({ error: 'Usage limit exceeded', limit: usageCheck.limit }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let context = '';
    
    // If RAG is enabled and document IDs are provided, get relevant context
    if (useRAG && documentIds.length > 0) {
      context = await getDocumentContext(documentIds, message, supabaseClient);
    }

    // Generate AI response
    const aiResponse = await generateChatResponse(message, context, user.id, supabaseClient);

    // Log usage
    await logUsage(user.id, 'ai_chat', supabaseClient);

    // Store conversation if conversationId is provided
    if (conversationId) {
      await storeConversation(conversationId, user.id, message, aiResponse, supabaseClient);
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        conversationId: conversationId || generateConversationId()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('AI Chat error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function checkUsageLimit(userId: string, operation: string, supabaseClient: any) {
  // Get user's subscription tier
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single()

  const tier = profile?.subscription_tier || 'free';
  
  // Define limits per tier
  const limits = {
    free: { daily: 5, monthly: 50 },
    basic: { daily: 25, monthly: 500 },
    premium: { daily: 100, monthly: 2000 },
    enterprise: { daily: 1000, monthly: 20000 }
  };

  const limit = limits[tier as keyof typeof limits] || limits.free;

  // Check today's usage
  const today = new Date().toISOString().split('T')[0];
  const { data: todayUsage } = await supabaseClient
    .from('ai_usage_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('operation', operation)
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lt('created_at', `${today}T23:59:59.999Z`)

  const todayCount = todayUsage?.length || 0;

  return {
    allowed: todayCount < limit.daily,
    limit: limit.daily,
    used: todayCount
  };
}

async function getDocumentContext(documentIds: string[], query: string, supabaseClient: any) {
  // Get embeddings for the query
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    return '';
  }

  try {
    // Generate query embedding
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: query,
        model: 'text-embedding-ada-002',
      }),
    });

    if (!embeddingResponse.ok) {
      console.error('Failed to generate query embedding');
      return '';
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Find similar document chunks using vector similarity
    const { data: similarChunks } = await supabaseClient.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 5,
      document_ids: documentIds
    });

    if (!similarChunks || similarChunks.length === 0) {
      return '';
    }

    // Combine relevant text chunks
    const context = similarChunks
      .map((chunk: any) => chunk.content || chunk.extracted_text)
      .filter(Boolean)
      .join('\n\n');

    return context;
  } catch (error) {
    console.error('Error getting document context:', error);
    return '';
  }
}

async function generateChatResponse(message: string, context: string, userId: string, supabaseClient: any) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const systemPrompt = `You are a helpful AI assistant specializing in legal document analysis and Singapore law. 
You provide accurate, helpful responses about legal documents and procedures.
${context ? `\n\nRelevant document context:\n${context}` : ''}

Important: Always remind users that your responses are for informational purposes only and do not constitute legal advice. Users should consult with qualified legal professionals for specific legal matters.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const chatData = await response.json();
  return chatData.choices[0].message.content;
}

async function logUsage(userId: string, operation: string, supabaseClient: any) {
  await supabaseClient
    .from('ai_usage_logs')
    .insert({
      user_id: userId,
      operation: operation,
      created_at: new Date().toISOString()
    });
}

async function storeConversation(conversationId: string, userId: string, userMessage: string, aiResponse: string, supabaseClient: any) {
  // Store user message
  await supabaseClient
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    });

  // Store AI response
  await supabaseClient
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role: 'assistant',
      content: aiResponse,
      created_at: new Date().toISOString()
    });
}

function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
