import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PublicDocumentUpload } from '@/components/legal/PublicDocumentUpload';
import { usePublicDocumentAnalysis } from '@/hooks/usePublicDocumentAnalysis';
import { publicAnalyticsService } from '@/lib/services/publicAnalytics';
import { ROUTES, PUBLIC_ANALYSIS_CONFIG } from '@/lib/config/constants';
import { FileText, Clock, Shield, Zap, ArrowRight, CheckCircle } from 'lucide-react';

export default function PublicAnalysis() {
  const navigate = useNavigate();
  const {
    analysisState,
    rateLimitStatus,
    analyzeDocument
  } = usePublicDocumentAnalysis();

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const analysis = await analyzeDocument(file);

      // Navigate to results page
      setTimeout(() => {
        navigate(`${ROUTES.publicAnalysisResult}/${analysis.id}`);
      }, 500);

    } catch (err) {
      console.error('Analysis error:', err);
      // Error is already handled by the hook
    }
  }, [analyzeDocument, navigate]);

  const features = [
    {
      icon: FileText,
      title: 'Text Extraction',
      description: 'Extract text from PDFs and images using advanced OCR technology'
    },
    {
      icon: Zap,
      title: 'Quick Analysis',
      description: 'Get document summary and key insights in seconds'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Documents are automatically deleted after 24 hours'
    },
    {
      icon: Clock,
      title: 'No Registration',
      description: 'Start analyzing immediately without creating an account'
    }
  ];

  const limitations = [
    'Basic text extraction and summary only',
    'Limited to 3 documents per hour, 10 per day',
    'Maximum file size: 10MB',
    'Documents deleted after 24 hours'
  ];

  const premiumFeatures = [
    'Advanced legal insights and compliance checks',
    'Entity extraction and risk assessment',
    'Unlimited document analysis',
    'Permanent document storage',
    'AI-powered legal Q&A',
    'Custom document templates'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Free Document Analysis
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload your legal documents and get instant analysis with our AI-powered platform.
            No registration required.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Upload Area */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Upload Document
                </CardTitle>
                <CardDescription>
                  Upload a PDF or image file to get started with free document analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysisState.error && (
                  <Alert className="mb-6 border-red-200 bg-red-50">
                    <AlertDescription className="text-red-700">
                      {analysisState.error}
                    </AlertDescription>
                  </Alert>
                )}

                {rateLimitStatus && !rateLimitStatus.allowed && (
                  <Alert className="mb-6 border-orange-200 bg-orange-50">
                    <AlertDescription className="text-orange-700">
                      <div className="space-y-2">
                        <p>{rateLimitStatus.message}</p>
                        <div className="text-sm">
                          <p>Remaining today: {rateLimitStatus.remaining.daily} documents</p>
                          <p>Remaining this hour: {rateLimitStatus.remaining.hourly} documents</p>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {analysisState.isAnalyzing && (
                  <div className="mb-6 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Analyzing document...</span>
                      <span>{analysisState.progress}%</span>
                    </div>
                    <Progress value={analysisState.progress} className="h-2" />
                  </div>
                )}

                <PublicDocumentUpload
                  onFileUpload={handleFileUpload}
                  disabled={analysisState.isAnalyzing || (rateLimitStatus && !rateLimitStatus.allowed)}
                  maxFileSize={PUBLIC_ANALYSIS_CONFIG.rateLimits.maxFileSize}
                  allowedTypes={PUBLIC_ANALYSIS_CONFIG.rateLimits.allowedFileTypes}
                />

                {/* Rate Limit Display */}
                {rateLimitStatus?.allowed && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">Usage Remaining:</p>
                      <div className="mt-1 space-y-1">
                        <p>This hour: {rateLimitStatus.remaining.hourly} documents</p>
                        <p>Today: {rateLimitStatus.remaining.daily} documents</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Features */}
            <div className="mt-8 grid md:grid-cols-2 gap-4">
              {features.map((feature) => (
                <Card key={feature.title} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <feature.icon className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Free Plan Limitations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Free Analysis Includes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {limitations.map((limitation) => (
                  <div key={limitation} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{limitation}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Upgrade Prompt */}
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader>
                <CardTitle className="text-lg text-blue-900">
                  Unlock Advanced Features
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Get unlimited access and advanced legal insights
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {premiumFeatures.slice(0, 4).map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-blue-800">{feature}</span>
                    </div>
                  ))}
                  {premiumFeatures.length > 4 && (
                    <p className="text-sm text-blue-700 font-medium">
                      +{premiumFeatures.length - 4} more features
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      publicAnalyticsService.trackInteraction('button_click', 'view_pricing_from_public_analysis');
                      navigate(ROUTES.pricing);
                    }}
                  >
                    View Pricing Plans
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={() => {
                      publicAnalyticsService.trackInteraction('button_click', 'create_account_from_public_analysis');
                      navigate(ROUTES.register);
                    }}
                  >
                    Create Free Account
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* File Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">File Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900">Supported Formats</h4>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="secondary">PDF</Badge>
                    <Badge variant="secondary">JPEG</Badge>
                    <Badge variant="secondary">PNG</Badge>
                    <Badge variant="secondary">WebP</Badge>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Size Limit</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Maximum 10MB per file
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Privacy</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Files are automatically deleted after 24 hours
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
