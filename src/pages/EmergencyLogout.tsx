import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, LogOut, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EmergencyLogout: React.FC = () => {
  const navigate = useNavigate();

  const handleEmergencyLogout = () => {
    console.log('🚨 EMERGENCY LOGOUT ACTIVATED 🚨');
    
    try {
      // Clear all storage immediately
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear any specific auth keys that might persist
      const authKeys = [
        'sb-kvlaydeyqidlfpfutbmp-auth-token',
        'supabase.auth.token',
        'auth-token',
        'user-session',
        'auth-state'
      ];
      
      authKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch (e) {
          console.warn('Failed to remove key:', key);
        }
      });
      
      console.log('✅ Emergency storage cleared');
      
      // Force redirect to homepage
      window.location.replace('/');
      
    } catch (error) {
      console.error('Emergency logout failed:', error);
      // Last resort - reload the page
      window.location.reload();
    }
  };

  const handleForceReload = () => {
    console.log('🔄 FORCE RELOAD ACTIVATED');
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Emergency Logout
          </CardTitle>
          <CardDescription className="text-gray-600">
            Use these options if you're having trouble signing out normally
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Button
            onClick={handleEmergencyLogout}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Emergency Logout
          </Button>
          
          <Button
            onClick={handleForceReload}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Force Reload Page
          </Button>
          
          <Button
            onClick={handleGoHome}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Home className="mr-2 h-4 w-4" />
            Go to Homepage
          </Button>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Console Commands
            </h4>
            <p className="text-xs text-blue-700 mb-2">
              You can also run these commands in the browser console:
            </p>
            <div className="space-y-1 text-xs font-mono bg-blue-100 p-2 rounded">
              <div>emergencyLogout()</div>
              <div>localStorage.clear()</div>
              <div>window.location.href = '/'</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmergencyLogout;
