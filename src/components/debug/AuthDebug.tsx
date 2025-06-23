import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export const AuthDebug: React.FC = () => {
  const { user, profile, session, loading, signOut } = useAuth();

  const clearSession = async () => {
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-white border-2 border-blue-500">
      <CardHeader>
        <CardTitle className="text-sm">Auth Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div>
          <strong>Loading:</strong> {loading ? 'true' : 'false'}
        </div>
        <div>
          <strong>User:</strong> {user ? user.email : 'null'}
        </div>
        <div>
          <strong>Session:</strong> {session ? 'exists' : 'null'}
        </div>
        <div>
          <strong>Profile:</strong> {profile ? `${profile.first_name} ${profile.last_name}` : 'null'}
        </div>
        <div>
          <strong>User ID:</strong> {user?.id || 'null'}
        </div>
        <div className="mt-2">
          <Button onClick={clearSession} size="sm" variant="outline">
            Clear Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
