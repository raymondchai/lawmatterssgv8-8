import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Clock, 
  FileText, 
  MessageSquare, 
  Building2, 
  Trash2,
  Filter,
  Calendar,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface SearchHistoryItem {
  id: string;
  query: string;
  type: 'legal_qa' | 'law_firms' | 'documents' | 'templates';
  timestamp: Date;
  results_count: number;
  clicked_result?: string;
}

const SearchHistory = () => {
  const { user } = useAuth();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Mock data for demonstration
  useEffect(() => {
    const mockHistory: SearchHistoryItem[] = [
      {
        id: '1',
        query: 'employment contract singapore',
        type: 'legal_qa',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        results_count: 15,
        clicked_result: 'Employment Act basics'
      },
      {
        id: '2',
        query: 'corporate law firms',
        type: 'law_firms',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        results_count: 8,
        clicked_result: 'Lee & Associates'
      },
      {
        id: '3',
        query: 'tenancy agreement template',
        type: 'templates',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        results_count: 12,
        clicked_result: 'Residential Tenancy Agreement'
      },
      {
        id: '4',
        query: 'contract analysis',
        type: 'documents',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        results_count: 6
      },
      {
        id: '5',
        query: 'divorce proceedings singapore',
        type: 'legal_qa',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        results_count: 22,
        clicked_result: 'Family Court procedures'
      }
    ];

    setSearchHistory(mockHistory);
    setFilteredHistory(mockHistory);
    setLoading(false);
  }, []);

  useEffect(() => {
    let filtered = searchHistory;

    // Filter by query
    if (filterQuery.trim()) {
      filtered = filtered.filter(item =>
        item.query.toLowerCase().includes(filterQuery.toLowerCase()) ||
        item.clicked_result?.toLowerCase().includes(filterQuery.toLowerCase())
      );
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    setFilteredHistory(filtered);
  }, [searchHistory, filterQuery, selectedType]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'legal_qa':
        return <MessageSquare className="h-4 w-4" />;
      case 'law_firms':
        return <Building2 className="h-4 w-4" />;
      case 'documents':
        return <FileText className="h-4 w-4" />;
      case 'templates':
        return <FileText className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'legal_qa':
        return 'Legal Q&A';
      case 'law_firms':
        return 'Law Firms';
      case 'documents':
        return 'Documents';
      case 'templates':
        return 'Templates';
      default:
        return 'Search';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'legal_qa':
        return 'bg-blue-100 text-blue-800';
      case 'law_firms':
        return 'bg-green-100 text-green-800';
      case 'documents':
        return 'bg-purple-100 text-purple-800';
      case 'templates':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const clearHistory = () => {
    setSearchHistory([]);
    setFilteredHistory([]);
  };

  const deleteHistoryItem = (id: string) => {
    const updated = searchHistory.filter(item => item.id !== id);
    setSearchHistory(updated);
  };

  const getSearchStats = () => {
    const totalSearches = searchHistory.length;
    const typeStats = searchHistory.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostSearchedType = Object.entries(typeStats).reduce((a, b) => 
      typeStats[a[0]] > typeStats[b[0]] ? a : b
    )?.[0] || 'legal_qa';

    return { totalSearches, typeStats, mostSearchedType };
  };

  const stats = getSearchStats();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Search History</h1>
            <p className="text-gray-600 mt-1">
              Track and manage your search activity across the platform
            </p>
          </div>
          <Button
            variant="outline"
            onClick={clearHistory}
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear History
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Searches</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalSearches}</p>
                </div>
                <Search className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Most Used</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {getTypeLabel(stats.mostSearchedType)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {searchHistory.filter(item => 
                      Date.now() - item.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000
                    ).length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Results</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {searchHistory.length > 0 
                      ? Math.round(searchHistory.reduce((sum, item) => sum + item.results_count, 0) / searchHistory.length)
                      : 0
                    }
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Filter search history..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('all')}
                >
                  All
                </Button>
                <Button
                  variant={selectedType === 'legal_qa' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('legal_qa')}
                >
                  Q&A
                </Button>
                <Button
                  variant={selectedType === 'law_firms' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('law_firms')}
                >
                  Law Firms
                </Button>
                <Button
                  variant={selectedType === 'documents' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('documents')}
                >
                  Documents
                </Button>
                <Button
                  variant={selectedType === 'templates' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('templates')}
                >
                  Templates
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search History List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Searches</CardTitle>
            <CardDescription>
              Your search activity across Legal Q&A, Law Firms, Documents, and Templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : filteredHistory.length > 0 ? (
              <div className="space-y-4">
                {filteredHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(item.type)}
                        <Badge className={getTypeColor(item.type)}>
                          {getTypeLabel(item.type)}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">"{item.query}"</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(item.timestamp, { addSuffix: true })}</span>
                          </span>
                          <span>{item.results_count} results</span>
                          {item.clicked_result && (
                            <span className="text-blue-600">→ {item.clicked_result}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteHistoryItem(item.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No search history found</h3>
                <p className="text-gray-500">
                  {filterQuery || selectedType !== 'all' 
                    ? 'Try adjusting your filters to see more results.'
                    : 'Start searching to see your history here.'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SearchHistory;
