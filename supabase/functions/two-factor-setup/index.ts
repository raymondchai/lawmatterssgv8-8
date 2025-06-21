import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { generateSecret } from 'https://esm.sh/speakeasy@2.0.0'

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

    const { userId } = await req.json()

    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate TOTP secret
    const secret = generateSecret({
      name: `LawMattersSG (${user.email})`,
      issuer: 'LawMattersSG',
      length: 32
    })

    // Generate backup codes
    const backupCodes = []
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase()
      backupCodes.push(code)
    }

    // Store the secret temporarily (will be permanently stored when verified)
    const { error: insertError } = await supabaseClient
      .from('two_factor_auth')
      .upsert({
        user_id: user.id,
        enabled: false,
        method: 'totp',
        secret: secret.base32,
        backup_codes: backupCodes
      })

    if (insertError) {
      console.error('Error storing 2FA setup:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to setup 2FA' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate backup codes and store them
    const { error: backupError } = await supabaseClient.rpc('generate_backup_codes', {
      target_user_id: user.id,
      num_codes: 10
    })

    if (backupError) {
      console.error('Error generating backup codes:', backupError)
    }

    return new Response(
      JSON.stringify({
        secret: secret.base32,
        qrCodeData: secret.otpauth_url,
        backupCodes
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in two-factor-setup:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
