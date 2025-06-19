import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Subscription tier limits
const TIER_LIMITS = {
  free: {
    aiQueries: 10,
    documentDownloads: 1,
    customDocuments: 0,
    documentUploads: 1
  },
  premium: {
    aiQueries: 50,
    documentDownloads: 10,
    customDocuments: 3,
    documentUploads: 10
  },
  pro: {
    aiQueries: 500,
    documentDownloads: 20,
    customDocuments: 20,
    documentUploads: 50
  },
  enterprise: {
    aiQueries: -1, // Unlimited
    documentDownloads: -1, // Unlimited
    customDocuments: -1, // Unlimited
    documentUploads: -1 // Unlimited
  }
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

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user's subscription tier
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const tier = profile.subscription_tier || 'free'
    const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free

    // Get current month's usage
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format

    // Get AI usage
    const { data: aiUsage, error: aiError } = await supabaseClient
      .from('ai_usage_logs')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', `${currentMonth}-01`)
      .lt('created_at', `${getNextMonth(currentMonth)}-01`)

    if (aiError) {
      console.error('Error fetching AI usage:', aiError)
    }

    // Get document uploads
    const { data: documentUploads, error: docError } = await supabaseClient
      .from('uploaded_documents')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', `${currentMonth}-01`)
      .lt('created_at', `${getNextMonth(currentMonth)}-01`)

    if (docError) {
      console.error('Error fetching document uploads:', docError)
    }

    // For now, we'll use placeholder values for document downloads and custom documents
    // In a real implementation, you'd track these in separate tables
    const current = {
      aiQueries: aiUsage?.length || 0,
      documentDownloads: 0, // Placeholder - implement tracking
      customDocuments: 0,   // Placeholder - implement tracking
      documentUploads: documentUploads?.length || 0
    }

    return new Response(
      JSON.stringify({
        current,
        limits,
        tier
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Get usage info error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function getNextMonth(currentMonth: string): string {
  const [year, month] = currentMonth.split('-').map(Number)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return `${nextYear}-${nextMonth.toString().padStart(2, '0')}`
}
