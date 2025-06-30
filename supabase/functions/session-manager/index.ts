import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CORS_HEADERS } from '../_shared/config.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cookie',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
}

interface SessionRequest {
  action: 'validate' | 'create' | 'destroy'
  email?: string
  password?: string
  sessionToken?: string
}

interface SessionResponse {
  success: boolean
  user?: {
    id: string
    email: string
    role: string
  }
  profile?: any
  error?: string
  sessionToken?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for server-side operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, email, password, sessionToken }: SessionRequest = await req.json()

    console.log(`🔐 Session Manager: ${action} request`)

    switch (action) {
      case 'create': {
        if (!email || !password) {
          return new Response(
            JSON.stringify({ success: false, error: 'Email and password required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Authenticate user with Supabase
        const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
          email,
          password
        })

        if (authError || !authData.user) {
          console.error('❌ Authentication failed:', authError)
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid credentials' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single()

        if (profileError) {
          console.error('❌ Profile fetch failed:', profileError)
        }

        // Create session token (simplified - in production use JWT or secure session store)
        const sessionToken = `session_${authData.user.id}_${Date.now()}`

        // Store session in database (you could also use Redis or other session store)
        await supabaseAdmin
          .from('user_sessions')
          .insert({
            user_id: authData.user.id,
            session_token: sessionToken,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            created_at: new Date().toISOString()
          })

        const response: SessionResponse = {
          success: true,
          user: {
            id: authData.user.id,
            email: authData.user.email!,
            role: profile?.role || 'free'
          },
          profile,
          sessionToken
        }

        // Set HTTP-only cookie
        const cookieHeader = `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`

        return new Response(
          JSON.stringify(response),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Set-Cookie': cookieHeader
            }
          }
        )
      }

      case 'validate': {
        // Get session token from cookie or request body
        const cookieHeader = req.headers.get('cookie')
        let token = sessionToken

        if (!token && cookieHeader) {
          const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=')
            acc[key] = value
            return acc
          }, {} as Record<string, string>)
          token = cookies.session
        }

        if (!token) {
          return new Response(
            JSON.stringify({ success: false, error: 'No session token' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Validate session in database
        const { data: sessionData, error: sessionError } = await supabaseAdmin
          .from('user_sessions')
          .select(`
            user_id,
            expires_at,
            profiles (*)
          `)
          .eq('session_token', token)
          .gt('expires_at', new Date().toISOString())
          .single()

        if (sessionError || !sessionData) {
          console.error('❌ Session validation failed:', sessionError)
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid or expired session' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get user data
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(sessionData.user_id)

        if (userError || !userData.user) {
          console.error('❌ User fetch failed:', userError)
          return new Response(
            JSON.stringify({ success: false, error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const response: SessionResponse = {
          success: true,
          user: {
            id: userData.user.id,
            email: userData.user.email!,
            role: sessionData.profiles?.role || 'free'
          },
          profile: sessionData.profiles
        }

        return new Response(
          JSON.stringify(response),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'destroy': {
        // Get session token from cookie or request body
        const cookieHeader = req.headers.get('cookie')
        let token = sessionToken

        if (!token && cookieHeader) {
          const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=')
            acc[key] = value
            return acc
          }, {} as Record<string, string>)
          token = cookies.session
        }

        if (token) {
          // Delete session from database
          await supabaseAdmin
            .from('user_sessions')
            .delete()
            .eq('session_token', token)
        }

        // Clear cookie
        const clearCookieHeader = `session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`

        return new Response(
          JSON.stringify({ success: true }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Set-Cookie': clearCookieHeader
            }
          }
        )
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('❌ Session manager error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
