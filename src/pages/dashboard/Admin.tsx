import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Shield, 
  Activity, 
  Flag,
  Settings,
  BarChart3,
  Database,
  FileText,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UserManagement } from '@/components/admin/UserManagement';
import { ContentModeration } from '@/components/admin/ContentModeration';
import { SystemMonitoring } from '@/components/admin/SystemMonitoring';
import { AdminLawFirmManager } from '@/components/lawfirms/AdminLawFirmManager';
import { TemplateManagement } from '@/components/admin/TemplateManagement';
import { TemplateAnalyticsDashboard } from '@/components/analytics';
import { usePermissions, useRoleAccess, PERMISSIONS } from '@/hooks/usePermissions';
import { useSafeAuth } from '@/contexts/AuthContext';

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { hasPermission } = usePermissions();
  const { canAccessAdmin } = useRoleAccess();
  const { profile } = useSafeAuth();

  // Check if user has admin access
  if (!canAccessAdmin()) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to access the admin dashboard.
            </p>
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const adminStats = [
    {
      title: 'Total Users',
      value: '1,250',
      description: '+12% from last month',
      icon: Users,
      color: 'text-blue-600',
      permission: PERMISSIONS.USERS_READ
    },
    {
      title: 'Pending Reviews',
      value: '23',
      description: 'Awaiting moderation',
      icon: MessageSquare,
      color: 'text-yellow-600',
      permission: PERMISSIONS.LAW_FIRMS_MODERATE_REVIEWS
    },
    {
      title: 'System Health',
      value: '99.9%',
      description: 'Uptime this month',
      icon: Activity,
      color: 'text-green-600',
      permission: PERMISSIONS.SYSTEM_MONITORING
    },
    {
      title: 'Active Sessions',
      value: '89',
      description: 'Currently online',
      icon: BarChart3,
      color: 'text-purple-600',
      permission: PERMISSIONS.SYSTEM_ANALYTICS
    }
  ];

  const quickActions = [
    {
      title: 'Manage Users',
      description: 'Add, edit, or remove user accounts',
      icon: Users,
      action: () => setActiveTab('users'),
      permission: PERMISSIONS.USERS_READ
    },
    {
      title: 'Content Moderation',
      description: 'Review and moderate user content',
      icon: Flag,
      action: () => setActiveTab('moderation'),
      permission: PERMISSIONS.LAW_FIRMS_MODERATE_REVIEWS
    },
    {
      title: 'System Monitoring',
      description: 'Monitor system health and performance',
      icon: Activity,
      action: () => setActiveTab('monitoring'),
      permission: PERMISSIONS.SYSTEM_MONITORING
    },
    {
      title: 'Law Firm Management',
      description: 'Manage law firm listings and verifications',
      icon: Database,
      action: () => setActiveTab('lawfirms'),
      permission: PERMISSIONS.LAW_FIRMS_VERIFY
    },
    {
      title: 'Template Management',
      description: 'Manage legal document templates',
      icon: FileText,
      action: () => setActiveTab('templates'),
      permission: PERMISSIONS.TEMPLATES_MANAGE
    },
    {
      title: 'Analytics Dashboard',
      description: 'View template marketplace analytics',
      icon: BarChart3,
      action: () => setActiveTab('analytics'),
      permission: PERMISSIONS.SYSTEM_ANALYTICS
    }
  ];

  const availableTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3, permission: null },
    { id: 'users', label: 'Users', icon: Users, permission: PERMISSIONS.USERS_READ },
    { id: 'moderation', label: 'Moderation', icon: Flag, permission: PERMISSIONS.LAW_FIRMS_MODERATE_REVIEWS },
    { id: 'lawfirms', label: 'Law Firms', icon: Database, permission: PERMISSIONS.LAW_FIRMS_VERIFY },
    { id: 'templates', label: 'Templates', icon: FileText, permission: PERMISSIONS.TEMPLATES_MANAGE },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, permission: PERMISSIONS.SYSTEM_ANALYTICS },
    { id: 'monitoring', label: 'Monitoring', icon: Activity, permission: PERMISSIONS.SYSTEM_MONITORING }
  ].filter(tab => !tab.permission || hasPermission(tab.permission));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {profile?.full_name || profile?.email}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full grid-cols-${availableTabs.length}`}>
            {availableTabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center space-x-2">
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {adminStats
                .filter(stat => !stat.permission || hasPermission(stat.permission))
                .map((stat, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-500">{stat.description}</p>
                      </div>
                      <stat.icon className={`h-8 w-8 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common administrative tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActions
                    .filter(action => !action.permission || hasPermission(action.permission))
                    .map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={action.action}
                    >
                      <action.icon className="h-6 w-6" />
                      <div className="text-center">
                        <p className="font-medium">{action.title}</p>
                        <p className="text-xs text-gray-500">{action.description}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <span>System Alerts</span>
                </CardTitle>
                <CardDescription>
                  Important notifications and system status updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">AI Service Performance</p>
                      <p className="text-sm text-yellow-700">
                        Response times are slightly elevated. Monitoring the situation.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-800">Content Moderation Queue</p>
                      <p className="text-sm text-blue-700">
                        23 items pending review in the moderation queue.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Activity className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">System Update Complete</p>
                      <p className="text-sm text-green-700">
                        Successfully deployed security updates with zero downtime.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent User Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">New user registrations</span>
                      <span className="font-medium">+15 today</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Documents uploaded</span>
                      <span className="font-medium">234 today</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Templates generated</span>
                      <span className="font-medium">45 today</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">AI chat sessions</span>
                      <span className="font-medium">89 today</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average response time</span>
                      <span className="font-medium text-green-600">120ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Error rate</span>
                      <span className="font-medium text-green-600">0.02%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">CPU usage</span>
                      <span className="font-medium text-yellow-600">45%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Memory usage</span>
                      <span className="font-medium text-yellow-600">67%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {hasPermission(PERMISSIONS.USERS_READ) && (
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
          )}

          {hasPermission(PERMISSIONS.LAW_FIRMS_MODERATE_REVIEWS) && (
            <TabsContent value="moderation">
              <ContentModeration />
            </TabsContent>
          )}

          {hasPermission(PERMISSIONS.LAW_FIRMS_VERIFY) && (
            <TabsContent value="lawfirms">
              <AdminLawFirmManager />
            </TabsContent>
          )}

          {hasPermission(PERMISSIONS.TEMPLATES_MANAGE) && (
            <TabsContent value="templates">
              <TemplateManagement />
            </TabsContent>
          )}

          {hasPermission(PERMISSIONS.SYSTEM_ANALYTICS) && (
            <TabsContent value="analytics">
              <TemplateAnalyticsDashboard />
            </TabsContent>
          )}

          {hasPermission(PERMISSIONS.SYSTEM_MONITORING) && (
            <TabsContent value="monitoring">
              <SystemMonitoring />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Admin;
