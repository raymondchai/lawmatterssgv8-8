import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Users, 
  FileText, 
  Database, 
  Server,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  RefreshCw
} from 'lucide-react';
import { rbacApi } from '@/lib/api/rbac';
import { usePermissions, PERMISSIONS } from '@/hooks/usePermissions';
import type { AuditLog } from '@/types';
import { toast } from '@/components/ui/sonner';
import { formatDistanceToNow } from 'date-fns';

interface SystemMonitoringProps {
  className?: string;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalDocuments: number;
  totalTemplates: number;
  totalLawFirms: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  uptime: string;
  responseTime: number;
}

interface UsageMetrics {
  dailyActiveUsers: number;
  documentsProcessed: number;
  templatesGenerated: number;
  searchQueries: number;
  aiOperations: number;
}

export const SystemMonitoring: React.FC<SystemMonitoringProps> = ({
  className = ''
}) => {
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalDocuments: 0,
    totalTemplates: 0,
    totalLawFirms: 0,
    systemHealth: 'healthy',
    uptime: '99.9%',
    responseTime: 120
  });
  
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics>({
    dailyActiveUsers: 0,
    documentsProcessed: 0,
    templatesGenerated: 0,
    searchQueries: 0,
    aiOperations: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const { hasPermission } = usePermissions();

  useEffect(() => {
    loadSystemData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadSystemData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    try {
      setLoading(true);
      
      // Load audit logs
      const logs = await rbacApi.getAuditLogs({ date_from: new Date(Date.now() - 24 * 60 * 60 * 1000) });
      setRecentActivity(logs);
      
      // In a real implementation, these would come from actual system metrics
      // For demo purposes, we'll simulate the data
      setSystemStats({
        totalUsers: 1250,
        activeUsers: 89,
        totalDocuments: 5420,
        totalTemplates: 156,
        totalLawFirms: 89,
        systemHealth: 'healthy',
        uptime: '99.9%',
        responseTime: Math.floor(Math.random() * 50) + 100
      });
      
      setUsageMetrics({
        dailyActiveUsers: 89,
        documentsProcessed: 234,
        templatesGenerated: 45,
        searchQueries: 1250,
        aiOperations: 567
      });
      
    } catch (error) {
      console.error('Error loading system data:', error);
      toast.error('Failed to load system data');
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return AlertTriangle;
      default: return Activity;
    }
  };

  if (!hasPermission(PERMISSIONS.SYSTEM_MONITORING)) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <Server className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">
            You don't have permission to view system monitoring.
          </p>
        </CardContent>
      </Card>
    );
  }

  const overviewStats = [
    {
      title: 'System Health',
      value: systemStats.systemHealth,
      description: `${systemStats.uptime} uptime`,
      icon: getHealthIcon(systemStats.systemHealth),
      color: getHealthColor(systemStats.systemHealth),
      trend: null
    },
    {
      title: 'Active Users',
      value: systemStats.activeUsers,
      description: `${systemStats.totalUsers} total users`,
      icon: Users,
      color: 'text-blue-600',
      trend: '+12%'
    },
    {
      title: 'Documents',
      value: systemStats.totalDocuments,
      description: `${usageMetrics.documentsProcessed} processed today`,
      icon: FileText,
      color: 'text-green-600',
      trend: '+8%'
    },
    {
      title: 'Response Time',
      value: `${systemStats.responseTime}ms`,
      description: 'Average response time',
      icon: Activity,
      color: systemStats.responseTime > 200 ? 'text-yellow-600' : 'text-green-600',
      trend: systemStats.responseTime > 200 ? '+5%' : '-3%'
    }
  ];

  const usageStats = [
    {
      title: 'Daily Active Users',
      value: usageMetrics.dailyActiveUsers,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Documents Processed',
      value: usageMetrics.documentsProcessed,
      icon: FileText,
      color: 'text-green-600'
    },
    {
      title: 'Templates Generated',
      value: usageMetrics.templatesGenerated,
      icon: Database,
      color: 'text-purple-600'
    },
    {
      title: 'Search Queries',
      value: usageMetrics.searchQueries,
      icon: BarChart3,
      color: 'text-orange-600'
    },
    {
      title: 'AI Operations',
      value: usageMetrics.aiOperations,
      icon: Activity,
      color: 'text-red-600'
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Monitoring</h2>
          <p className="text-gray-600">
            Monitor system health, performance, and usage metrics
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadSystemData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {overviewStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.description}</p>
                </div>
                <div className="flex flex-col items-end">
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  {stat.trend && (
                    <div className={`flex items-center mt-2 ${
                      stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.trend.startsWith('+') ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      <span className="text-xs">{stat.trend}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Monitoring */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage Metrics</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>Current system health and performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Database</span>
                  <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">API Server</span>
                  <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">File Storage</span>
                  <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">AI Services</span>
                  <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Email Service</span>
                  <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Resource Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
                <CardDescription>Current system resource utilization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>CPU Usage</span>
                    <span>45%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Memory Usage</span>
                    <span>67%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '67%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Storage Usage</span>
                    <span>23%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '23%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Network I/O</span>
                    <span>12%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-600 h-2 rounded-full" style={{ width: '12%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {usageStats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="p-6 text-center">
                  <stat.icon className={`h-8 w-8 ${stat.color} mx-auto mb-2`} />
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Usage Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Trends (Last 7 Days)</CardTitle>
              <CardDescription>Daily usage patterns and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <PieChart className="h-12 w-12 mx-auto mb-2" />
                  <p>Usage charts would be displayed here</p>
                  <p className="text-sm">Integration with charting library needed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent System Activity</CardTitle>
              <CardDescription>Latest admin actions and system events</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center space-x-3 p-3 border rounded-lg">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                          <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((log) => (
                    <div key={log.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Activity className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {log.user?.full_name || 'System'}
                          </span>
                          <span className="text-gray-600">{log.action.replace(/_/g, ' ')}</span>
                          <Badge variant="outline" className="text-xs">
                            {log.resource_type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                  <p className="text-gray-500">
                    System activity will appear here as it occurs.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
