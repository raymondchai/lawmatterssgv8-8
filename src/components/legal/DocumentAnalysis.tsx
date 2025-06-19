import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  FileText, 
  Users, 
  Calendar, 
  DollarSign, 
  MapPin,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Download,
  RefreshCw
} from 'lucide-react';
import { analyzeDocument, summarizeDocument, extractEntities, type DocumentAnalysis } from '@/lib/api/openai';
import type { UploadedDocument } from '@/types';
import { toast } from '@/components/ui/sonner';

interface DocumentAnalysisProps {
  document: UploadedDocument;
  className?: string;
}

interface ExtractedEntities {
  people: string[];
  organizations: string[];
  dates: string[];
  amounts: string[];
  locations: string[];
}

export const DocumentAnalysisComponent: React.FC<DocumentAnalysisProps> = ({
  document,
  className = ''
}) => {
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [entities, setEntities] = useState<ExtractedEntities | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Check if analysis already exists in document structure
    if (document.document_structure && typeof document.document_structure === 'object') {
      const existingAnalysis = (document.document_structure as any).analysis;
      if (existingAnalysis) {
        setAnalysis(existingAnalysis);
      }
    }
  }, [document]);

  const performAnalysis = async () => {
    if (!document.ocr_text) {
      toast.error('No text content available for analysis');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      // Step 1: Document Analysis
      setAnalysisProgress(20);
      const documentAnalysis = await analyzeDocument(document.ocr_text);
      setAnalysis(documentAnalysis);

      // Step 2: Generate Summary
      setAnalysisProgress(50);
      const documentSummary = await summarizeDocument(document.ocr_text, 800);
      setSummary(documentSummary);

      // Step 3: Extract Entities
      setAnalysisProgress(80);
      const extractedEntities = await extractEntities(document.ocr_text);
      setEntities(extractedEntities);

      setAnalysisProgress(100);
      toast.success('Document analysis completed successfully');
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze document: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportAnalysis = () => {
    const analysisData = {
      document: {
        filename: document.filename,
        type: document.document_type,
        uploadDate: document.created_at
      },
      analysis,
      summary,
      entities,
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(analysisData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document.filename}_analysis.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <span>AI Document Analysis</span>
            </CardTitle>
            <CardDescription>
              AI-powered analysis of {document.filename}
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            {(analysis || summary || entities) && (
              <Button variant="outline" size="sm" onClick={exportAnalysis}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            <Button 
              onClick={performAnalysis} 
              disabled={isAnalyzing || !document.ocr_text}
              size="sm"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {analysis ? 'Re-analyze' : 'Analyze'}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!document.ocr_text && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No text content available. Please ensure the document has been processed with OCR.
            </AlertDescription>
          </Alert>
        )}

        {isAnalyzing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Analyzing document...</span>
              <span>{analysisProgress}%</span>
            </div>
            <Progress value={analysisProgress} className="w-full" />
          </div>
        )}

        {(analysis || summary || entities) && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="entities">Entities</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {analysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Document Classification</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{analysis.documentType}</Badge>
                        <div className={`text-sm ${getConfidenceColor(analysis.confidence)}`}>
                          {getConfidenceLabel(analysis.confidence)} confidence
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Key Entities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-600">
                        {analysis.keyEntities.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {analysis.keyEntities.slice(0, 3).map((entity, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {entity}
                              </Badge>
                            ))}
                            {analysis.keyEntities.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{analysis.keyEntities.length - 3} more
                              </Badge>
                            )}
                          </div>
                        ) : (
                          'No key entities identified'
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {analysis && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Executive Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700">{analysis.summary}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              {summary ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Document Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{summary}</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No summary available. Click "Analyze" to generate one.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="entities" className="space-y-4">
              {entities ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>People</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {entities.people.length > 0 ? (
                        <div className="space-y-1">
                          {entities.people.map((person, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {person}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">None identified</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>Organizations</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {entities.organizations.length > 0 ? (
                        <div className="space-y-1">
                          {entities.organizations.map((org, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {org}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">None identified</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Dates</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {entities.dates.length > 0 ? (
                        <div className="space-y-1">
                          {entities.dates.map((date, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {date}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">None identified</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <DollarSign className="h-4 w-4" />
                        <span>Amounts</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {entities.amounts.length > 0 ? (
                        <div className="space-y-1">
                          {entities.amounts.map((amount, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {amount}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">None identified</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span>Locations</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {entities.locations.length > 0 ? (
                        <div className="space-y-1">
                          {entities.locations.map((location, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {location}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">None identified</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No entities extracted. Click "Analyze" to extract entities.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              {analysis && (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Legal Implications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analysis.legalImplications.length > 0 ? (
                        <ul className="space-y-2">
                          {analysis.legalImplications.map((implication, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{implication}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No legal implications identified</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Recommended Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analysis.recommendedActions.length > 0 ? (
                        <ul className="space-y-2">
                          {analysis.recommendedActions.map((action, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{action}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No specific actions recommended</p>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}

        {!analysis && !summary && !entities && !isAnalyzing && document.ocr_text && (
          <div className="text-center text-gray-500 py-8">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-4">Ready to analyze this document with AI</p>
            <Button onClick={performAnalysis}>
              <Brain className="h-4 w-4 mr-2" />
              Start Analysis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
