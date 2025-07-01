// Debug SessionManager - Will catch and trace all calls
console.log("🔍 SessionManager file loaded at:", new Date().toISOString());

interface SessionUser {
  id: string
  email: string
  role: string
}

export const sessionManager = {
  signIn: (email: string, password: string) => {
    console.error("🚨 CAUGHT: SessionManager.signIn() called!");
    console.trace("📍 EXACT CALL STACK:");
    console.log("📧 Email:", email);
    console.log("🔒 Password length:", password?.length || 0);

    // Log the current location
    console.log("📍 Called from file:", new Error().stack);

    throw new Error("❌ SessionManager.signIn() is disabled - Check console trace above to find the caller!");
  },

  signOut: () => {
    console.error("🚨 CAUGHT: SessionManager.signOut() called!");
    console.trace("📍 EXACT CALL STACK:");
    throw new Error("❌ SessionManager.signOut() is disabled");
  },

  validateSession: () => {
    console.error("🚨 CAUGHT: SessionManager.validateSession() called!");
    console.trace("📍 EXACT CALL STACK:");
    return Promise.resolve(null);
  },

  clearMemoryState: () => {
    console.error("🚨 CAUGHT: SessionManager.clearMemoryState() called!");
    console.trace("📍 EXACT CALL STACK:");
  }
};

console.log("✅ Debug SessionManager loaded successfully");

// Export types
export type { SessionUser }
