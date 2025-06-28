import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Search, 
  BookOpen, 
  FileText, 
  Scale, 
  Building, 
  HelpCircle, 
  Book,
  Loader2,
  Trash2,
  Edit
} from 'lucide-react';
import { ragKnowledgeBase, type KnowledgeChunk } from '@/lib/services/ragKnowledgeBase';
import { useToast } from '@/hooks/use-toast';

const CATEGORY_ICONS = {
  legal_document: FileText,
  case_law: Scale,
  statute: Building,
  regulation: Book,
  faq: HelpCircle,
  guide: BookOpen
};

const PRACTICE_AREAS = [
  'Contract Law',
  'Employment Law',
  'Corporate Law',
  'Intellectual Property',
  'Real Estate',
  'Family Law',
  'Criminal Law',
  'Civil Litigation',
  'Data Protection',
  'Immigration Law'
];

export const KnowledgeBaseManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('add');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<KnowledgeChunk[]>([]);
  const [stats, setStats] = useState<any>(null);
  const { toast } = useToast();

  // Add knowledge form state
  const [addForm, setAddForm] = useState({
    content: '',
    title: '',
    source: '',
    category: 'legal_document' as KnowledgeChunk['category'],
    practiceArea: '',
    jurisdiction: 'Singapore',
    tags: ''
  });

  // Search form state
  const [searchForm, setSearchForm] = useState({
    query: '',
    category: '',
    practiceArea: '',
    jurisdiction: 'Singapore'
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const statsData = await ragKnowledgeBase.getKnowledgeStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleAddKnowledge = async () => {
    if (!addForm.content.trim() || !addForm.title.trim() || !addForm.source.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in content, title, and source fields.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const metadata = {
        practice_area: addForm.practiceArea,
        jurisdiction: addForm.jurisdiction,
        tags: addForm.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      };

      await ragKnowledgeBase.addKnowledge(
        addForm.content,
        addForm.title,
        addForm.source,
        addForm.category,
        metadata
      );

      toast({
        title: "Knowledge Added",
        description: "Successfully added knowledge to the RAG system.",
      });

      // Reset form
      setAddForm({
        content: '',
        title: '',
        source: '',
        category: 'legal_document',
        practiceArea: '',
        jurisdiction: 'Singapore',
        tags: ''
      });

      // Reload stats
      loadStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add knowledge.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchForm.query.trim()) {
      toast({
        title: "Missing Query",
        description: "Please enter a search query.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const results = await ragKnowledgeBase.searchKnowledge({
        query: searchForm.query,
        category: searchForm.category as KnowledgeChunk['category'] || undefined,
        practiceArea: searchForm.practiceArea || undefined,
        jurisdiction: searchForm.jurisdiction || undefined,
        maxResults: 10
      });

      setSearchResults(results);
      
      if (results.length === 0) {
        toast({
          title: "No Results",
          description: "No matching knowledge found. Try adjusting your search criteria.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Search Error",
        description: error.message || "Failed to search knowledge base.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestRAG = async () => {
    if (!searchForm.query.trim()) {
      toast({
        title: "Missing Query",
        description: "Please enter a question to test RAG.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await ragKnowledgeBase.generateResponse(searchForm.query, {
        category: searchForm.category as KnowledgeChunk['category'] || undefined,
        practiceArea: searchForm.practiceArea || undefined,
        jurisdiction: searchForm.jurisdiction || undefined
      });

      // Show response in a modal or new tab
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>RAG Response</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
              <h1>RAG Response</h1>
              <h2>Question:</h2>
              <p><strong>${searchForm.query}</strong></p>
              
              <h2>Answer:</h2>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${response.answer}</div>
              
              <h2>Confidence: ${(response.confidence * 100).toFixed(1)}%</h2>
              
              <h2>Sources Used:</h2>
              <ul>
                ${response.sources.map(source => `
                  <li>
                    <strong>${source.title}</strong> (${source.category})
                    <br><small>Source: ${source.source}</small>
                    <br><small>Similarity: ${((source.similarity || 0) * 100).toFixed(1)}%</small>
                  </li>
                `).join('')}
              </ul>
              
              <h2>Reasoning:</h2>
              <p><em>${response.reasoning}</em></p>
            </body>
          </html>
        `);
      }

      toast({
        title: "RAG Response Generated",
        description: "Response opened in new window.",
      });
    } catch (error: any) {
      toast({
        title: "RAG Error",
        description: error.message || "Failed to generate RAG response.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">RAG Knowledge Base</h2>
          <p className="text-gray-600">Manage your legal knowledge for AI-powered responses</p>
        </div>
        
        {stats && (
          <div className="flex space-x-4">
            <Badge variant="secondary">
              {stats.totalChunks} Total Chunks
            </Badge>
            <Badge variant="outline">
              {Object.keys(stats.categoryCounts || {}).length} Categories
            </Badge>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="add">Add Knowledge</TabsTrigger>
          <TabsTrigger value="search">Search & Test</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Knowledge</CardTitle>
              <CardDescription>
                Add legal documents, cases, or guides to your RAG knowledge base
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={addForm.title}
                    onChange={(e) => setAddForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Employment Act Overview"
                  />
                </div>
                <div>
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    value={addForm.source}
                    onChange={(e) => setAddForm(prev => ({ ...prev, source: e.target.value }))}
                    placeholder="e.g., Singapore Statutes Online"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={addForm.category} onValueChange={(value) => setAddForm(prev => ({ ...prev, category: value as KnowledgeChunk['category'] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center space-x-2">
                            <Icon className="h-4 w-4" />
                            <span>{key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="practiceArea">Practice Area</Label>
                  <Select value={addForm.practiceArea} onValueChange={(value) => setAddForm(prev => ({ ...prev, practiceArea: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select practice area" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRACTICE_AREAS.map(area => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="jurisdiction">Jurisdiction</Label>
                  <Input
                    id="jurisdiction"
                    value={addForm.jurisdiction}
                    onChange={(e) => setAddForm(prev => ({ ...prev, jurisdiction: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={addForm.tags}
                  onChange={(e) => setAddForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g., overtime, working hours, employment"
                />
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={addForm.content}
                  onChange={(e) => setAddForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter the legal content, case details, or guidance..."
                  rows={8}
                />
              </div>

              <Button onClick={handleAddKnowledge} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Add to Knowledge Base
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search & Test RAG</CardTitle>
              <CardDescription>
                Search your knowledge base and test RAG responses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="searchQuery">Search Query / Question</Label>
                <Input
                  id="searchQuery"
                  value={searchForm.query}
                  onChange={(e) => setSearchForm(prev => ({ ...prev, query: e.target.value }))}
                  placeholder="e.g., What are the overtime rules in Singapore?"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Category Filter</Label>
                  <Select value={searchForm.category} onValueChange={(value) => setSearchForm(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center space-x-2">
                            <Icon className="h-4 w-4" />
                            <span>{key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Practice Area Filter</Label>
                  <Select value={searchForm.practiceArea} onValueChange={(value) => setSearchForm(prev => ({ ...prev, practiceArea: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All practice areas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Practice Areas</SelectItem>
                      {PRACTICE_AREAS.map(area => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Jurisdiction</Label>
                  <Input
                    value={searchForm.jurisdiction}
                    onChange={(e) => setSearchForm(prev => ({ ...prev, jurisdiction: e.target.value }))}
                    placeholder="Singapore"
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button onClick={handleSearch} disabled={loading} variant="outline" className="flex-1">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                  Search Knowledge
                </Button>
                <Button onClick={handleTestRAG} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BookOpen className="h-4 w-4 mr-2" />}
                  Test RAG Response
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Search Results ({searchResults.length})</h3>
                  {searchResults.map((result, index) => {
                    const Icon = CATEGORY_ICONS[result.category];
                    return (
                      <Card key={result.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Icon className="h-4 w-4" />
                              <h4 className="font-medium">{result.title}</h4>
                              <Badge variant="outline">{(result.similarity! * 100).toFixed(1)}% match</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{result.content.substring(0, 200)}...</p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span>Source: {result.source}</span>
                              {result.metadata.practice_area && (
                                <Badge variant="secondary" className="text-xs">
                                  {result.metadata.practice_area}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Knowledge Base Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {stats ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-2xl font-bold">{stats.totalChunks}</div>
                      <div className="text-sm text-gray-600">Total Knowledge Chunks</div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">By Category</h4>
                      <div className="space-y-1">
                        {Object.entries(stats.categoryCounts || {}).map(([category, count]) => (
                          <div key={category} className="flex justify-between">
                            <span className="capitalize">{category.replace('_', ' ')}</span>
                            <span>{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Practice Areas</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.practiceAreaCounts ? (
                  <div className="space-y-1">
                    {Object.entries(stats.practiceAreaCounts).map(([area, count]) => (
                      <div key={area} className="flex justify-between">
                        <span>{area}</span>
                        <span>{count as number}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    No practice area data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Alert>
            <BookOpen className="h-4 w-4" />
            <AlertDescription>
              Your RAG system is ready! Add more legal knowledge to improve AI responses. 
              The system automatically chunks content and generates embeddings for semantic search.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
};
