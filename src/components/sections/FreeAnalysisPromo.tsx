import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/config/constants';
import { 
  FileText, 
  Zap, 
  Clock, 
  Shield, 
  ArrowRight, 
  CheckCircle,
  Star,
  Users
} from 'lucide-react';

export const FreeAnalysisPromo = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Zap,
      title: 'Instant Analysis',
      description: 'Get document insights in seconds with AI-powered analysis'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your documents are automatically deleted after 24 hours'
    },
    {
      icon: Clock,
      title: 'No Registration',
      description: 'Start analyzing immediately without creating an account'
    },
    {
      icon: FileText,
      title: 'Multiple Formats',
      description: 'Support for PDF, JPEG, PNG, and WebP files up to 10MB'
    }
  ];

  const benefits = [
    'Extract text from PDFs and images',
    'Generate document summaries',
    'Identify key terms and concepts',
    'Basic document classification',
    'No credit card required',
    'Try before you subscribe'
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Small Business Owner',
      content: 'The free analysis helped me understand my lease agreement before signing. Very helpful!',
      rating: 5
    },
    {
      name: 'Michael Tan',
      role: 'Freelancer',
      content: 'Quick and easy way to get insights from legal documents. Saved me time and money.',
      rating: 5
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-yellow-100 text-yellow-800 border-yellow-300">
            🎉 Free Tool Available
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Try Our Free Document Analysis
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Get instant insights from your legal documents with our AI-powered analysis tool. 
            No registration required, completely free to try.
          </p>
          <Button 
            size="lg"
            onClick={() => navigate(ROUTES.publicAnalysis)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            <Zap className="mr-2 h-5 w-5" />
            Analyze Document Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature) => (
            <Card key={feature.title} className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits and Demo */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Benefits */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              What You Get with Free Analysis
            </h3>
            <div className="space-y-3">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Want More?</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Upgrade to get advanced legal insights, unlimited analysis, and permanent storage.
                  </p>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-blue-600 hover:text-blue-700"
                    onClick={() => navigate(ROUTES.pricing)}
                  >
                    View Pricing Plans →
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Demo Preview */}
          <div className="relative">
            <Card className="shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">Sample Analysis Result</span>
                </div>
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Document Type</h4>
                    <Badge variant="secondary">Employment Contract</Badge>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Key Terms Found</h4>
                    <div className="flex flex-wrap gap-1">
                      {['salary', 'probation', 'termination', 'benefits'].map((term) => (
                        <Badge key={term} variant="outline" className="text-xs">
                          {term}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Summary</h4>
                    <p className="text-xs text-gray-600">
                      This employment contract outlines the terms and conditions of employment including salary, benefits, and termination clauses...
                    </p>
                  </div>
                </div>
                <Button 
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                  onClick={() => navigate(ROUTES.publicAnalysis)}
                >
                  Try With Your Document
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Testimonials */}
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            What Users Are Saying
          </h3>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex justify-center mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">"{testimonial.content}"</p>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Usage Stats */}
        <div className="text-center">
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">1,000+</div>
              <div className="text-sm text-gray-600">Documents Analyzed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">95%</div>
              <div className="text-sm text-gray-600">Accuracy Rate</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">30s</div>
              <div className="text-sm text-gray-600">Average Analysis Time</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
