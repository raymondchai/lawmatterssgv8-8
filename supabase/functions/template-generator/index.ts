import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TemplateGenerationRequest {
  templateType: string;
  description: string;
  variables?: Record<string, any>;
  customInstructions?: string;
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
    const { 
      templateType, 
      description, 
      variables = {}, 
      customInstructions = '' 
    }: TemplateGenerationRequest = await req.json()

    if (!templateType || !description) {
      return new Response(
        JSON.stringify({ error: 'Template type and description are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check usage limits
    const usageCheck = await checkUsageLimit(user.id, 'template_generation', supabaseClient);
    if (!usageCheck.allowed) {
      return new Response(
        JSON.stringify({ error: 'Usage limit exceeded', limit: usageCheck.limit }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate template using AI
    const generatedTemplate = await generateTemplate(
      templateType, 
      description, 
      variables, 
      customInstructions
    );

    // Save template to database
    const { data: savedTemplate, error: saveError } = await supabaseClient
      .from('templates')
      .insert({
        title: `${templateType} - ${description}`,
        description: description,
        category: templateType,
        content: generatedTemplate.content,
        variables: generatedTemplate.variables,
        created_by: user.id,
        is_public: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (saveError) {
      throw new Error(`Failed to save template: ${saveError.message}`);
    }

    // Log usage
    await logUsage(user.id, 'template_generation', supabaseClient);

    return new Response(
      JSON.stringify({ 
        success: true,
        template: savedTemplate,
        generatedContent: generatedTemplate.content
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Template generation error:', error);
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
    free: { daily: 2, monthly: 10 },
    basic: { daily: 10, monthly: 50 },
    premium: { daily: 50, monthly: 200 },
    enterprise: { daily: 200, monthly: 1000 }
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

async function generateTemplate(
  templateType: string, 
  description: string, 
  variables: Record<string, any>, 
  customInstructions: string
) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const systemPrompt = `You are an expert legal document template generator specializing in Singapore law and legal practices. 

Generate a professional legal document template based on the user's requirements. The template should:
1. Be legally sound and appropriate for Singapore jurisdiction
2. Include placeholder variables in the format {{VARIABLE_NAME}}
3. Follow proper legal document structure and formatting
4. Include necessary clauses and provisions
5. Be clear, professional, and comprehensive

Template Type: ${templateType}
Description: ${description}
${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}

Return your response in the following JSON format:
{
  "content": "The complete template content with {{VARIABLE}} placeholders",
  "variables": {
    "VARIABLE_NAME": {
      "label": "Human-readable label",
      "type": "text|number|date|select",
      "required": true|false,
      "description": "Description of what this variable represents",
      "options": ["option1", "option2"] // only for select type
    }
  }
}

Important: Ensure all content is appropriate for Singapore legal context and includes proper disclaimers.`;

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
        { role: 'user', content: `Generate a ${templateType} template: ${description}` }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const chatData = await response.json();
  const responseContent = chatData.choices[0].message.content;

  try {
    // Try to parse as JSON
    const parsedResponse = JSON.parse(responseContent);
    return parsedResponse;
  } catch (parseError) {
    // If JSON parsing fails, create a basic structure
    return {
      content: responseContent,
      variables: extractVariablesFromContent(responseContent)
    };
  }
}

function extractVariablesFromContent(content: string): Record<string, any> {
  const variables: Record<string, any> = {};
  const variableRegex = /\{\{([^}]+)\}\}/g;
  let match;

  while ((match = variableRegex.exec(content)) !== null) {
    const variableName = match[1].trim();
    if (!variables[variableName]) {
      variables[variableName] = {
        label: variableName.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        type: 'text',
        required: true,
        description: `Enter value for ${variableName}`
      };
    }
  }

  return variables;
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
