/**
 * Client-side Session Manager
 * Handles server-controlled authentication with HTTP-only cookies
 */

interface SessionUser {
  id: string
  email: string
  role: string
}

interface SessionResponse {
  success: boolean
  user?: SessionUser
  profile?: any
  error?: string
  sessionToken?: string
}

class SessionManager {
  private baseUrl: string
  private sessionUser: SessionUser | null = null
  private sessionProfile: any = null

  constructor() {
    // Use environment variable or default to production URL
    this.baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace('/rest/v1', '') || 'https://kvlaydeyqidlfpfutbmp.supabase.co'
  }

  /**
   * Sign in with email and password
   * Creates server-side session with HTTP-only cookie
   */
  async signIn(email: string, password: string): Promise<{ user: SessionUser; profile: any }> {
    console.log('🔐 SessionManager: Starting sign-in process')
    
    try {
      const response = await fetch(`${this.baseUrl}/functions/v1/session-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        credentials: 'include', // Important: Include cookies
        body: JSON.stringify({
          action: 'create',
          email,
          password
        })
      })

      const data: SessionResponse = await response.json()

      if (!data.success || !data.user) {
        throw new Error(data.error || 'Sign-in failed')
      }

      // Store user data in memory (not localStorage!)
      this.sessionUser = data.user
      this.sessionProfile = data.profile

      console.log('✅ SessionManager: Sign-in successful')
      return { user: data.user, profile: data.profile }
    } catch (error) {
      console.error('❌ SessionManager: Sign-in failed:', error)
      throw error
    }
  }

  /**
   * Validate current session
   * Checks HTTP-only cookie with server
   */
  async validateSession(): Promise<{ user: SessionUser; profile: any } | null> {
    console.log('🔍 SessionManager: Validating session')
    
    try {
      const response = await fetch(`${this.baseUrl}/functions/v1/session-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        credentials: 'include', // Important: Include cookies
        body: JSON.stringify({
          action: 'validate'
        })
      })

      const data: SessionResponse = await response.json()

      if (data.success && data.user) {
        // Store user data in memory
        this.sessionUser = data.user
        this.sessionProfile = data.profile
        console.log('✅ SessionManager: Session valid')
        return { user: data.user, profile: data.profile }
      } else {
        // Clear memory state
        this.sessionUser = null
        this.sessionProfile = null
        console.log('ℹ️ SessionManager: No valid session')
        return null
      }
    } catch (error) {
      console.error('❌ SessionManager: Session validation failed:', error)
      // Clear memory state on error
      this.sessionUser = null
      this.sessionProfile = null
      return null
    }
  }

  /**
   * Sign out
   * Destroys server-side session and clears HTTP-only cookie
   */
  async signOut(): Promise<void> {
    console.log('🚪 SessionManager: Starting sign-out process')
    
    try {
      const response = await fetch(`${this.baseUrl}/functions/v1/session-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        credentials: 'include', // Important: Include cookies
        body: JSON.stringify({
          action: 'destroy'
        })
      })

      const data: SessionResponse = await response.json()

      if (!data.success) {
        console.warn('⚠️ SessionManager: Sign-out response not successful, but continuing cleanup')
      }

      // Always clear memory state
      this.sessionUser = null
      this.sessionProfile = null

      console.log('✅ SessionManager: Sign-out completed')
    } catch (error) {
      console.error('❌ SessionManager: Sign-out failed:', error)
      // Still clear memory state even if server call failed
      this.sessionUser = null
      this.sessionProfile = null
      throw error
    }
  }

  /**
   * Get current user from memory (no server call)
   */
  getCurrentUser(): SessionUser | null {
    return this.sessionUser
  }

  /**
   * Get current profile from memory (no server call)
   */
  getCurrentProfile(): any {
    return this.sessionProfile
  }

  /**
   * Check if user is authenticated (memory check only)
   */
  isAuthenticated(): boolean {
    return this.sessionUser !== null
  }

  /**
   * Clear all session data from memory
   * Used for emergency cleanup
   */
  clearMemoryState(): void {
    console.log('🧹 SessionManager: Clearing memory state')
    this.sessionUser = null
    this.sessionProfile = null
  }
}

// Export singleton instance
export const sessionManager = new SessionManager()

// Export types
export type { SessionUser }
