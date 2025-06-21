import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TemplateAnalyticsDashboard } from '@/components/analytics';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePermissions, PERMISSIONS } from '@/hooks/usePermissions';
import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TemplateAnalytics: React.FC = () => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  // Check if user has analytics access
  if (!hasPermission(PERMISSIONS.SYSTEM_ANALYTICS)) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to access template analytics.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <TemplateAnalyticsDashboard />
    </DashboardLayout>
  );
};

export default TemplateAnalytics;
