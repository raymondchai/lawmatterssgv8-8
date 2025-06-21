import React from 'react';
import { AuthenticatedRoute } from '@/components/auth/ProtectedRoute';
import { AccountSecurity } from '@/components/auth/AccountSecurity';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const SecuritySettings: React.FC = () => {
  return (
    <AuthenticatedRoute>
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <AccountSecurity />
        </div>
      </DashboardLayout>
    </AuthenticatedRoute>
  );
};

export default SecuritySettings;
