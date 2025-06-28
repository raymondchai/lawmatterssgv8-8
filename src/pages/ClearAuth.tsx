import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trash2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ClearAuth: React.FC = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [isCleared, setIsCleared] = useState(false);

  const clearAllAuthData = async () => {
    setIsClearing(true);
    try {
      console.log('Starting auth data cleanup...');

      // 1. Sign out from Supabase
      try {
        await supabase.auth.signOut();
        console.log('✓ Signed out from Supabase');
      } catch (error) {
        console.log('⚠ Supabase signout error (continuing):', error);
      }

      // 2. Clear all localStorage
      const localStorageKeys = Object.keys(localStorage);
      localStorageKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('✓ Cleared localStorage');

      // 3. Clear all sessionStorage
      const sessionStorageKeys = Object.keys(sessionStorage);
      sessionStorageKeys.forEach(key => {
        sessionStorage.removeItem(key);
      });
      console.log('✓ Cleared sessionStorage');

      // 4. Clear any cookies (if any)
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      console.log('✓ Cleared cookies');

      // 5. Set flag to prevent session restoration
      localStorage.setItem('skipSessionRestore', 'true');
      console.log('✓ Set skip session restore flag');

      setIsCleared(true);
      console.log('✅ All authentication data cleared successfully');

      // Wait a moment then redirect
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (error) {
      console.error('❌ Error clearing auth data:', error);
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    // Auto-clear on page load
    clearAllAuthData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            {isClearing ? (
              <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
            ) : isCleared ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <Trash2 className="w-6 h-6 text-red-600" />
            )}
          </div>
          <CardTitle>
            {isClearing ? 'Clearing Authentication Data...' : 
             isCleared ? 'Authentication Data Cleared' : 
             'Clear Authentication Data'}
          </CardTitle>
          <CardDescription>
            {isClearing ? 'Please wait while we clear all stored authentication data.' :
             isCleared ? 'All authentication data has been cleared. Redirecting to home page...' :
             'This will clear all stored authentication data and sign you out.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {!isClearing && !isCleared && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                This will clear:
              </p>
              <ul className="text-sm text-gray-600 text-left space-y-1">
                <li>• Local storage data</li>
                <li>• Session storage data</li>
                <li>• Authentication cookies</li>
                <li>• Supabase session</li>
              </ul>
              <Button 
                onClick={clearAllAuthData}
                className="w-full"
                variant="destructive"
              >
                Clear All Data
              </Button>
            </div>
          )}
          
          {isClearing && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Clearing authentication data...</p>
              <div className="text-xs text-gray-500">This may take a few seconds</div>
            </div>
          )}
          
          {isCleared && (
            <div className="space-y-2">
              <p className="text-sm text-green-600">✅ Successfully cleared all data</p>
              <p className="text-xs text-gray-500">Redirecting to home page...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClearAuth;
