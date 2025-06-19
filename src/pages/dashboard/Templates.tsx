import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Wand2, 
  Search, 
  Plus,
  TrendingUp,
  Clock,
  Star
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TemplateBrowser, TemplateCustomizer, TemplateGenerator } from '@/components/templates';
import type { Template } from '@/types';
import type { GeneratedTemplate } from '@/lib/services/templateGenerator';

const Templates: React.FC = () => {
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [generatedTemplate, setGeneratedTemplate] = useState<GeneratedTemplate | null>(null);

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setActiveTab('customize');
  };

  const handleTemplateGenerated = (template: GeneratedTemplate) => {
    setGeneratedTemplate(template);
    // Convert GeneratedTemplate to Template for customization
    const convertedTemplate: Template = {
      id: 'generated-' + Date.now(),
      name: template.name,
      description: template.description,
      category: template.category,
      content: template.content,
      variables: template.variables,
      is_public: false,
      created_by: 'current-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setSelectedTemplate(convertedTemplate);
    setActiveTab('customize');
  };

  const templateStats = [
    {
      title: 'Available Templates',
      value: '150+',
      description: 'Professional legal templates',
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      title: 'AI Generated',
      value: '50+',
      description: 'Custom AI-created templates',
      icon: Wand2,
      color: 'text-purple-600'
    },
    {
      title: 'Most Popular',
      value: 'Service Agreement',
      description: 'This month\'s top template',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      title: 'Recently Added',
      value: '12',
      description: 'New templates this week',
      icon: Clock,
      color: 'text-orange-600'
    }
  ];

  const featuredCategories = [
    {
      name: 'Contracts & Agreements',
      count: 45,
      description: 'Service agreements, NDAs, and general contracts',
      popular: true
    },
    {
      name: 'Employment Law',
      count: 28,
      description: 'Employment contracts and HR documents',
      popular: true
    },
    {
      name: 'Corporate Documents',
      count: 32,
      description: 'Partnership agreements and corporate filings',
      popular: false
    },
    {
      name: 'Real Estate',
      count: 18,
      description: 'Lease agreements and property documents',
      popular: false
    },
    {
      name: 'Compliance & Regulatory',
      count: 15,
      description: 'Privacy policies and terms of service',
      popular: true
    },
    {
      name: 'Personal Legal',
      count: 12,
      description: 'Wills, powers of attorney, and personal documents',
      popular: false
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Legal Templates</h1>
            <p className="text-gray-600 mt-1">
              Browse, customize, and generate professional legal document templates
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setActiveTab('generate')}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Generate with AI
            </Button>
            <Button onClick={() => setActiveTab('browse')}>
              <Search className="h-4 w-4 mr-2" />
              Browse Templates
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {templateStats.map((stat, index) => (
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

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="browse" className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>Browse Templates</span>
            </TabsTrigger>
            <TabsTrigger value="generate" className="flex items-center space-x-2">
              <Wand2 className="h-4 w-4" />
              <span>AI Generator</span>
            </TabsTrigger>
            <TabsTrigger value="customize" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Customize</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            {/* Featured Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Template Categories</CardTitle>
                <CardDescription>
                  Explore templates by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredCategories.map((category, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{category.name}</h3>
                        <div className="flex items-center space-x-1">
                          <Badge variant="secondary">{category.count}</Badge>
                          {category.popular && (
                            <Star className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Template Browser */}
            <TemplateBrowser
              onTemplateSelect={handleTemplateSelect}
              onTemplatePreview={(template) => {
                setSelectedTemplate(template);
                setActiveTab('customize');
              }}
            />
          </TabsContent>

          <TabsContent value="generate" className="space-y-6">
            <TemplateGenerator onTemplateGenerated={handleTemplateGenerated} />
          </TabsContent>

          <TabsContent value="customize" className="space-y-6">
            {selectedTemplate ? (
              <TemplateCustomizer
                template={selectedTemplate}
                onSave={(content, variables) => {
                  console.log('Template customized:', { content, variables });
                  // Handle save logic here
                }}
                onDownload={(content, filename) => {
                  // Create and download file
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              />
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    No Template Selected
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Choose a template from the browser or generate a new one with AI to start customizing.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('browse')}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Browse Templates
                    </Button>
                    <Button onClick={() => setActiveTab('generate')}>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate with AI
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Templates;
