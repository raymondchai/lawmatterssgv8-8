import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DocumentProcessRequest {
  documentId: string;
  operation: 'extract-text' | 'generate-embeddings' | 'classify' | 'summarize';
  options?: Record<string, any>;
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

    // Parse request body
    const { documentId, operation, options = {} }: DocumentProcessRequest = await req.json()

    if (!documentId || !operation) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: documentId, operation' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get document from database
    const { data: document, error: docError } = await supabaseClient
      .from('uploaded_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update document status to processing
    await supabaseClient
      .from('uploaded_documents')
      .update({ 
        processing_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    let result: any = {};

    try {
      switch (operation) {
        case 'extract-text':
          result = await extractText(document, supabaseClient);
          break;
        case 'generate-embeddings':
          result = await generateEmbeddings(document, supabaseClient);
          break;
        case 'classify':
          result = await classifyDocument(document, supabaseClient);
          break;
        case 'summarize':
          result = await summarizeDocument(document, supabaseClient);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      // Update document status to completed
      await supabaseClient
        .from('uploaded_documents')
        .update({ 
          processing_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)

      return new Response(
        JSON.stringify({ success: true, result }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (processingError) {
      console.error('Processing error:', processingError);
      
      // Update document status to failed
      await supabaseClient
        .from('uploaded_documents')
        .update({ 
          processing_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)

      throw processingError;
    }

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function extractText(document: any, supabaseClient: any) {
  // Get file from storage
  const { data: fileData } = await supabaseClient.storage
    .from('documents')
    .download(document.file_path)

  if (!fileData) {
    throw new Error('Failed to download file from storage');
  }

  // For now, return placeholder text extraction
  // In a real implementation, you would use a PDF parsing library
  const extractedText = `Extracted text from ${document.filename}`;
  
  // Store extracted text in document record
  await supabaseClient
    .from('uploaded_documents')
    .update({ 
      extracted_text: extractedText,
      updated_at: new Date().toISOString()
    })
    .eq('id', document.id)

  return { extractedText };
}

async function generateEmbeddings(document: any, supabaseClient: any) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Get extracted text or extract it first
  let text = document.extracted_text;
  if (!text) {
    const extractResult = await extractText(document, supabaseClient);
    text = extractResult.extractedText;
  }

  // Generate embeddings using OpenAI
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-ada-002',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const embeddingData = await response.json();
  const embedding = embeddingData.data[0].embedding;

  // Store embedding in database
  await supabaseClient
    .from('document_embeddings')
    .upsert({
      document_id: document.id,
      embedding: embedding,
      model: 'text-embedding-ada-002',
      created_at: new Date().toISOString()
    })

  return { embedding: embedding.slice(0, 5) }; // Return first 5 dimensions for response
}

async function classifyDocument(document: any, supabaseClient: any) {
  // Placeholder classification logic
  // In a real implementation, you would use ML models or OpenAI for classification
  const classification = {
    type: 'contract',
    confidence: 0.85,
    categories: ['legal', 'business'],
  };

  await supabaseClient
    .from('uploaded_documents')
    .update({ 
      document_type: classification.type,
      updated_at: new Date().toISOString()
    })
    .eq('id', document.id)

  return classification;
}

async function summarizeDocument(document: any, supabaseClient: any) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Get extracted text or extract it first
  let text = document.extracted_text;
  if (!text) {
    const extractResult = await extractText(document, supabaseClient);
    text = extractResult.extractedText;
  }

  // Generate summary using OpenAI
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a legal document summarizer. Provide a concise summary of the document.'
        },
        {
          role: 'user',
          content: `Please summarize this document: ${text}`
        }
      ],
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const summaryData = await response.json();
  const summary = summaryData.choices[0].message.content;

  // Store summary in document record
  await supabaseClient
    .from('uploaded_documents')
    .update({ 
      summary: summary,
      updated_at: new Date().toISOString()
    })
    .eq('id', document.id)

  return { summary };
}
