import React, { useState } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Upload, 
  Search, 
  Download, 
  Eye,
  Sparkles,
  Shield,
  Clock,
  CheckCircle
} from 'lucide-react';

const Documents = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data for document templates
  const documentTemplates = [
    {
      id: 1,
      title: "Employment Contract Template",
      description: "Standard employment agreement template compliant with Singapore's Employment Act",
      category: "Employment",
      downloads: 1250,
      rating: 4.8,
      price: "Free",
      isPopular: true
    },
    {
      id: 2,
      title: "Tenancy Agreement",
      description: "Comprehensive rental agreement template for residential properties",
      category: "Property",
      downloads: 980,
      rating: 4.7,
      price: "$15",
      isPopular: true
    },
    {
      id: 3,
      title: "Non-Disclosure Agreement (NDA)",
      description: "Protect your confidential information with this legally binding NDA",
      category: "Corporate",
      downloads: 750,
      rating: 4.9,
      price: "$10",
      isPopular: false
    },
    {
      id: 4,
      title: "Power of Attorney",
      description: "Grant legal authority to act on your behalf in specific matters",
      category: "Personal",
      downloads: 420,
      rating: 4.6,
      price: "$20",
      isPopular: false
    }
  ];

  const categories = ["All", "Employment", "Property", "Corporate", "Personal", "Family", "Immigration"];

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Analysis",
      description: "Upload any legal document for instant AI analysis and summary"
    },
    {
      icon: Shield,
      title: "Singapore Law Compliant",
      description: "All templates are updated to comply with current Singapore regulations"
    },
    {
      icon: CheckCircle,
      title: "Lawyer Reviewed",
      description: "Every template is reviewed and approved by qualified Singapore lawyers"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-blue-900 text-white pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Legal Documents & Analysis
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Upload documents for AI-powered analysis or download customizable 
              legal templates specific to Singapore law.
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-blue-900 font-semibold">
                <Upload className="mr-2 h-5 w-5" />
                Analyze Document
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-900">
                <Download className="mr-2 h-5 w-5" />
                Browse Templates
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
                  <feature.icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Document Analysis Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Document Analysis</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Upload any legal document and get instant AI-powered analysis, 
              key terms extraction, and risk assessment.
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
              <CardContent className="p-12 text-center">
                <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload Your Document
                </h3>
                <p className="text-gray-600 mb-6">
                  Drag and drop your PDF, Word, or image file here, or click to browse
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Choose File
                </Button>
                <p className="text-sm text-gray-500 mt-4">
                  Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Templates Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Document Templates</h2>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((category) => (
              <Badge 
                key={category} 
                variant={category === "All" ? "default" : "outline"}
                className="cursor-pointer hover:bg-blue-50"
              >
                {category}
              </Badge>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documentTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                        {template.title}
                      </CardTitle>
                      {template.isPopular && (
                        <Badge className="bg-yellow-100 text-yellow-800 mb-2">
                          Popular
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">{template.price}</div>
                    </div>
                  </div>
                  <CardDescription className="text-gray-600">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="secondary">{template.category}</Badge>
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Download className="h-4 w-4" />
                      <span>{template.downloads}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              View All Templates
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Documents;
