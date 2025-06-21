import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { usePublicAnalysisResult } from '@/hooks/usePublicDocumentAnalysis';
import { ROUTES } from '@/lib/config/constants';
import {
  FileText,
  Clock,
  ArrowRight,
  AlertCircle,
  Star,
  Zap,
  Shield,
  Users,
  X
} from 'lucide-react';

export default function PublicAnalysisResult() {
  const { analysisId } = useParams<{ analysisId: string }>();
  const navigate = useNavigate();

  const { data: analysis, isLoading: loading, error } = usePublicAnalysisResult(analysisId);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTimeRemaining = (expiresAt: Date): string => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return 'Expired';
    }
  };

  const premiumFeatures = [
    {
      icon: Star,
      title: 'Advanced Legal Insights',
      description: 'Get detailed legal analysis, risk assessment, and compliance checks'
    },
    {
      icon: Zap,
      title: 'Unlimited Analysis',
      description: 'Analyze unlimited documents without rate limits or file size restrictions'
    },
    {
      icon: Shield,
      title: 'Secure Storage',
      description: 'Permanent document storage with enterprise-grade security'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Share documents and collaborate with team members'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <h3 className="text-lg font-semibold">Loading Analysis Results...</h3>
              <p className="text-gray-600">Please wait while we retrieve your document analysis.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analysis Not Found</h3>
            <p className="text-gray-600 mb-6">
              {error?.message ?? 'The analysis you\'re looking for doesn\'t exist or has expired.'}
            </p>
            <Button onClick={() => navigate(ROUTES.publicAnalysis)}>
              Analyze New Document
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timeRemaining = getTimeRemaining(analysis.expiresAt);
  const isExpired = new Date() > analysis.expiresAt;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Document Analysis Complete
          </h1>
          <p className="text-gray-600">
            Here are the results from your free document analysis
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Document Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Document Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Filename</h4>
                    <p className="text-gray-600">{analysis.filename}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">File Size</h4>
                    <p className="text-gray-600">{formatFileSize(analysis.fileSize)}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Document Type</h4>
                    <Badge variant="secondary">{analysis.analysisResult.documentType}</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Text Length</h4>
                    <p className="text-gray-600">{analysis.analysisResult.textLength.toLocaleString()} characters</p>
                  </div>
                </div>

                {/* Expiration Warning */}
                {!isExpired && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-700">
                      This analysis will expire in {timeRemaining}. Results are automatically deleted after 24 hours.
                    </AlertDescription>
                  </Alert>
                )}

                {isExpired && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                      This analysis has expired and will be deleted soon.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Analysis Results */}
            <Card>
              <CardHeader>
                <CardTitle>Document Summary</CardTitle>
                <CardDescription>
                  AI-generated summary and key insights from your document
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* OCR Quality */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Text Extraction Quality</h4>
                    <span className="text-sm text-gray-600">
                      {Math.round(analysis.analysisResult.ocrQuality * 100)}%
                    </span>
                  </div>
                  <Progress value={analysis.analysisResult.ocrQuality * 100} className="h-2" />
                </div>

                <Separator />

                {/* Summary */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Document Summary</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 leading-relaxed">
                      {analysis.analysisResult.summary}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Keywords */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Key Terms</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.analysisResult.keyWords.map((keyword) => (
                      <Badge key={keyword} variant="outline">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Button 
                    onClick={() => navigate(ROUTES.publicAnalysis)}
                    variant="outline"
                    className="w-full"
                  >
                    Analyze Another Document
                  </Button>
                  <Button 
                    onClick={() => navigate(ROUTES.register)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Create Free Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Upgrade Prompt */}
          <div className="space-y-6">
            {/* Upgrade Card */}
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader>
                <CardTitle className="text-blue-900">
                  Unlock Advanced Analysis
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Get deeper insights with our premium features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {premiumFeatures.map((feature) => (
                    <div key={feature.title} className="flex items-start gap-3">
                      <feature.icon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-blue-900">{feature.title}</h4>
                        <p className="text-sm text-blue-700">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-3">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => navigate(ROUTES.pricing)}
                  >
                    View Pricing Plans
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={() => navigate(ROUTES.register)}
                  >
                    Start Free Trial
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* What You're Missing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What You're Missing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-500">
                    <X className="h-4 w-4" />
                    <span className="text-sm">Legal entity extraction</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <X className="h-4 w-4" />
                    <span className="text-sm">Risk assessment</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <X className="h-4 w-4" />
                    <span className="text-sm">Compliance checking</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <X className="h-4 w-4" />
                    <span className="text-sm">Document comparison</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <X className="h-4 w-4" />
                    <span className="text-sm">Export to Word/PDF</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
