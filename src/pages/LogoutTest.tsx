import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const LogoutTest: React.FC = () => {
  const { user, signOut, loading } = useAuth();

  const handleDirectSignOut = async () => {
    console.log('Direct signOut button clicked');
    try {
      console.log('Calling signOut...');
      await signOut();
      console.log('SignOut completed successfully');
    } catch (error) {
      console.error('SignOut failed:', error);
      alert(`SignOut failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleForceSignOut = () => {
    console.log('Force signOut button clicked');
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear any Supabase-specific storage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    
    // Force reload
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Logout Test Page</CardTitle>
            <CardDescription>
              Test logout functionality and debug authentication issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium mb-2">Current Auth State:</h3>
              <p><strong>User:</strong> {user?.email || 'Not logged in'}</p>
              <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
              <p><strong>User ID:</strong> {user?.id || 'None'}</p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleDirectSignOut}
                className="w-full"
                disabled={!user || loading}
              >
                Test Direct SignOut
              </Button>

              <Button 
                onClick={handleForceSignOut}
                variant="destructive"
                className="w-full"
              >
                Force Clear All Data & Reload
              </Button>

              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="w-full"
              >
                Go to Homepage
              </Button>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-medium mb-2">Instructions:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Open browser console (F12) to see debug logs</li>
                <li>Click "Test Direct SignOut" to test normal logout</li>
                <li>If that fails, use "Force Clear All Data & Reload"</li>
                <li>Check console for any error messages</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LogoutTest;
