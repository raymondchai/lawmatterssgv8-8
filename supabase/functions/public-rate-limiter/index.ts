import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RateLimitRequest {
  ipAddress: string;
  userAgent?: string;
  action: 'check' | 'increment';
  resourceType?: 'document_analysis';
}

interface RateLimitResponse {
  allowed: boolean;
  remaining: {
    hourly: number;
    daily: number;
  };
  resetTime: {
    hourly: string;
    daily: string;
  };
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { ipAddress, userAgent, action, resourceType }: RateLimitRequest = await req.json()

    if (!ipAddress) {
      return new Response(
        JSON.stringify({ error: 'IP address is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Configuration
    const config = {
      hourlyLimit: 3,
      dailyLimit: 10,
      sessionDuration: 60 * 60 * 1000, // 1 hour in milliseconds
    }

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get recent analysis count for this IP
    const { data: recentAnalyses, error: queryError } = await supabaseClient
      .from('public_document_analyses')
      .select('created_at')
      .eq('ip_address', ipAddress)
      .gte('created_at', oneDayAgo.toISOString())

    if (queryError) {
      console.error('Error querying rate limit:', queryError)
      return new Response(
        JSON.stringify({ error: 'Failed to check rate limit' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const hourlyCount = recentAnalyses?.filter(
      analysis => new Date(analysis.created_at) > oneHourAgo
    ).length || 0

    const dailyCount = recentAnalyses?.length || 0

    const hourlyRemaining = Math.max(0, config.hourlyLimit - hourlyCount)
    const dailyRemaining = Math.max(0, config.dailyLimit - dailyCount)

    const allowed = hourlyRemaining > 0 && dailyRemaining > 0

    // Calculate reset times
    const nextHour = new Date(now)
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
    
    const nextDay = new Date(now)
    nextDay.setDate(nextDay.getDate() + 1)
    nextDay.setHours(0, 0, 0, 0)

    const response: RateLimitResponse = {
      allowed,
      remaining: {
        hourly: hourlyRemaining,
        daily: dailyRemaining
      },
      resetTime: {
        hourly: nextHour.toISOString(),
        daily: nextDay.toISOString()
      },
      message: allowed ? undefined : 
        hourlyRemaining === 0 ? 'Hourly limit exceeded. Please try again in an hour.' :
        'Daily limit exceeded. Please try again tomorrow or register for unlimited access.'
    }

    // If this is an increment action and allowed, create a session if needed
    if (action === 'increment' && allowed) {
      // Get or create session
      const expiresAt = new Date(now.getTime() + config.sessionDuration)
      
      const { data: existingSession } = await supabaseClient
        .from('public_analysis_sessions')
        .select('id')
        .eq('ip_address', ipAddress)
        .gt('expires_at', now.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!existingSession) {
        // Create new session
        const { error: sessionError } = await supabaseClient
          .from('public_analysis_sessions')
          .insert({
            ip_address: ipAddress,
            user_agent: userAgent || '',
            documents_analyzed: 0,
            expires_at: expiresAt.toISOString(),
            total_storage_used: 0
          })

        if (sessionError) {
          console.error('Error creating session:', sessionError)
          return new Response(
            JSON.stringify({ error: 'Failed to create session' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Rate limiter error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/* To deploy this function:
1. Make sure you have the Supabase CLI installed
2. Run: supabase functions deploy public-rate-limiter
3. Set the required environment variables:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
*/
