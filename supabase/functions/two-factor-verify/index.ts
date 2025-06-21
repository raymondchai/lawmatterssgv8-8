import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { totp } from 'https://esm.sh/speakeasy@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the request
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { userId, token, backupCode } = await req.json()

    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let verified = false

    if (backupCode) {
      // Verify backup code using database function
      const { data: backupVerified, error: backupError } = await supabaseClient
        .rpc('verify_two_factor_code', {
          target_user_id: user.id,
          code: backupCode,
          method_type: 'backup'
        })

      if (backupError) {
        console.error('Error verifying backup code:', backupError)
        return new Response(
          JSON.stringify({ error: 'Failed to verify backup code' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      verified = backupVerified || false
    } else if (token) {
      // Get user's 2FA settings
      const { data: authSettings, error: settingsError } = await supabaseClient
        .from('two_factor_auth')
        .select('secret')
        .eq('user_id', user.id)
        .eq('enabled', true)
        .single()

      if (settingsError || !authSettings?.secret) {
        return new Response(
          JSON.stringify({ error: '2FA not properly configured' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Verify TOTP token
      verified = totp.verify({
        secret: authSettings.secret,
        encoding: 'base32',
        token,
        window: 2
      })

      if (verified) {
        // Update last used timestamp
        await supabaseClient
          .from('two_factor_auth')
          .update({ last_used_at: new Date().toISOString() })
          .eq('user_id', user.id)
      }
    }

    // Log the attempt
    await supabaseClient
      .from('two_factor_attempts')
      .insert({
        user_id: user.id,
        method: backupCode ? 'backup' : 'totp',
        code_hash: 'hashed', // In production, hash the actual code
        success: verified,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      })

    return new Response(
      JSON.stringify({ verified }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in two-factor-verify:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
