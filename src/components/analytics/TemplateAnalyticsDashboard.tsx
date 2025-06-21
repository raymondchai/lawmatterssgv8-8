import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  templateAnalyticsService, 
  type TemplateAnalyticsData,
  type TemplatePerformanceMetrics,
  type RevenueAnalytics
} from '@/lib/services/templateAnalytics';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  DollarSign, 
  Users, 
  FileText,
  Star,
  Eye,
  Calendar,
  Filter,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TemplateAnalyticsDashboardProps {
  className?: string;
}

export const TemplateAnalyticsDashboard: React.FC<TemplateAnalyticsDashboardProps> = ({
  className = ''
}) => {
  const [analyticsData, setAnalyticsData] = useState<TemplateAnalyticsData | null>(null);
  const [performanceData, setPerformanceData] = useState<TemplatePerformanceMetrics[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const [analytics, performance, revenue] = await Promise.all([
        templateAnalyticsService.getDashboardAnalytics({ start: startDate, end: endDate }),
        templateAnalyticsService.getTemplatePerformance(),
        templateAnalyticsService.getRevenueAnalytics()
      ]);

      setAnalyticsData(analytics);
      setPerformanceData(performance);
      setRevenueData(revenue);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-SG').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div className={className}>
        <Alert>
          <AlertDescription>
            {error || 'Failed to load analytics data. Please try again.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const overviewStats = [
    {
      title: 'Total Templates',
      value: formatNumber(analyticsData.totalTemplates),
      change: '+12%',
      changeValue: 12,
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      title: 'Total Downloads',
      value: formatNumber(analyticsData.totalDownloads),
      change: '+8.5%',
      changeValue: 8.5,
      icon: Download,
      color: 'text-green-600'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(analyticsData.totalRevenue),
      change: '+15.2%',
      changeValue: 15.2,
      icon: DollarSign,
      color: 'text-purple-600'
    },
    {
      title: 'Active Users',
      value: formatNumber(analyticsData.totalUsers),
      change: '+6.8%',
      changeValue: 6.8,
      icon: Users,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Template Analytics</h2>
          <p className="text-gray-600 mt-1">
            Comprehensive insights into template marketplace performance
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={loadAnalyticsData} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {overviewStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    {getTrendIcon(stat.changeValue)}
                    <span className={`text-sm ml-1 ${
                      stat.changeValue > 0 ? 'text-green-600' : 
                      stat.changeValue < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">vs last period</span>
                  </div>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Popular Templates */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Popular Templates
                </CardTitle>
                <CardDescription>
                  Top performing templates by downloads
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.popularTemplates.slice(0, 5).map((template, index) => (
                    <div key={template.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{template.title}</p>
                          <p className="text-sm text-gray-500">{template.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatNumber(template.downloadCount)}</p>
                        <p className="text-sm text-gray-500">downloads</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Category Performance
                </CardTitle>
                <CardDescription>
                  Downloads and revenue by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.categoryStats.slice(0, 5).map((category) => (
                    <div key={category.categoryId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{category.categoryName}</span>
                        <span className="text-sm text-gray-500">
                          {formatNumber(category.downloadCount)} downloads
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min((category.downloadCount / Math.max(...analyticsData.categoryStats.map(c => c.downloadCount))) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Format Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Download Format Preferences</CardTitle>
              <CardDescription>
                User preferences for document formats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analyticsData.formatStats.map((format) => (
                  <div key={format.format} className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatPercentage(format.percentage)}
                    </div>
                    <div className="text-sm text-gray-600 uppercase tracking-wide">
                      {format.format}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatNumber(format.count)} downloads
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Performance Metrics</CardTitle>
              <CardDescription>
                Detailed performance analysis for all templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Template</th>
                      <th className="text-right p-2">Views</th>
                      <th className="text-right p-2">Downloads</th>
                      <th className="text-right p-2">Conversion</th>
                      <th className="text-right p-2">Revenue</th>
                      <th className="text-right p-2">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceData.slice(0, 10).map((template) => (
                      <tr key={template.templateId} className="border-b">
                        <td className="p-2">
                          <div>
                            <p className="font-medium">{template.title}</p>
                            <p className="text-xs text-gray-500">
                              Updated {formatDistanceToNow(template.lastUpdated, { addSuffix: true })}
                            </p>
                          </div>
                        </td>
                        <td className="text-right p-2">{formatNumber(template.views)}</td>
                        <td className="text-right p-2">{formatNumber(template.downloads)}</td>
                        <td className="text-right p-2">{formatPercentage(template.conversionRate)}</td>
                        <td className="text-right p-2">{formatCurrency(template.revenue)}</td>
                        <td className="text-right p-2">
                          <div className="flex items-center justify-end gap-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            {template.rating.toFixed(1)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          {revenueData && (
            <>
              {/* Revenue Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(revenueData.monthlyRevenue)}
                        </p>
                        <div className="flex items-center mt-1">
                          {getTrendIcon(revenueData.revenueGrowth)}
                          <span className={`text-sm ml-1 ${
                            revenueData.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatPercentage(revenueData.revenueGrowth)}
                          </span>
                        </div>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Average Order Value</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(revenueData.averageOrderValue)}
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(revenueData.totalRevenue)}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Revenue Templates */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Revenue Generating Templates</CardTitle>
                  <CardDescription>
                    Templates contributing most to revenue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {revenueData.topRevenueTemplates.map((template, index) => (
                      <div key={template.templateId} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-green-600">
                              {index + 1}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{template.title}</p>
                            <p className="text-sm text-gray-500">
                              {formatNumber(template.downloads)} downloads
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            {formatCurrency(template.revenue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {analyticsData.userEngagement.averageSessionDuration}s
                  </p>
                  <p className="text-sm text-gray-600">Avg Session Duration</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPercentage(analyticsData.userEngagement.bounceRate)}
                  </p>
                  <p className="text-sm text-gray-600">Bounce Rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPercentage(analyticsData.userEngagement.conversionRate)}
                  </p>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPercentage(analyticsData.userEngagement.repeatUsers)}
                  </p>
                  <p className="text-sm text-gray-600">Repeat Users</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
