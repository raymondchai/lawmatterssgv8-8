// Emergency Auth Cleanup Script
// Run this in the browser console on craftchatbot.com to clear all authentication data

console.log('🧹 Starting authentication data cleanup...');

// Function to clear all authentication data
function clearAllAuthData() {
  try {
    // 1. Clear localStorage
    const localStorageKeys = Object.keys(localStorage);
    console.log('📦 Clearing localStorage keys:', localStorageKeys);
    localStorageKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // 2. Clear sessionStorage
    const sessionStorageKeys = Object.keys(sessionStorage);
    console.log('📦 Clearing sessionStorage keys:', sessionStorageKeys);
    sessionStorageKeys.forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    // 3. Clear cookies
    console.log('🍪 Clearing cookies...');
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // 4. Clear any Supabase-specific storage
    console.log('🔐 Clearing Supabase-specific data...');
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    
    // 5. Set flag to skip session restoration
    localStorage.setItem('skipSessionRestore', 'true');
    
    console.log('✅ Authentication data cleared successfully!');
    console.log('🔄 Reloading page in 2 seconds...');
    
    // Reload the page after a short delay
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
  }
}

// Run the cleanup
clearAllAuthData();
