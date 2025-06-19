import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SubscriptionManager } from '@/components/subscription';

const Subscription = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
          <p className="text-gray-600 mt-2">
            Manage your subscription, billing, and usage
          </p>
        </div>
        
        <SubscriptionManager />
      </div>
    </DashboardLayout>
  );
};

export default Subscription;
