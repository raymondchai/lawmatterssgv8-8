import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Brain, 
  FileText, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Eye,
  Zap,
  RefreshCw,
  Download
} from 'lucide-react';
import { 
  documentAnalysisService, 
  type DocumentAnalysisResult,
  type DocumentSummary,
  type EntityExtraction,
  type LegalInsights
} from '@/lib/services/documentAnalysis';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface DocumentAnalysisPanelProps {
  documentId: string;
  documentName: string;
  onAnalysisComplete?: (analysis: DocumentAnalysisResult) => void;
}

const DocumentAnalysisPanel: React.FC<DocumentAnalysisPanelProps> = ({
  documentId,
  documentName,
  onAnalysisComplete
}) => {
  const [analysis, setAnalysis] = useState<DocumentAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisOptions, setAnalysisOptions] = useState({
    includeSummary: true,
    includeEntities: true,
    includeInsights: true,
    customPrompt: ''
  });
  const [activeTab, setActiveTab] = useState('summary');
  
  const { toast } = useToast();

  useEffect(() => {
    loadExistingAnalysis();
  }, [documentId]);

  const loadExistingAnalysis = async () => {
    try {
      const existingAnalysis = await documentAnalysisService.getAnalysisResults(documentId);
      if (existingAnalysis) {
        setAnalysis(existingAnalysis);
      }
    } catch (error) {
      console.error('Failed to load existing analysis:', error);
    }
  };

  const performAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      
      const result = await documentAnalysisService.analyzeDocument(documentId, analysisOptions);
      setAnalysis(result);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }

      toast({
        title: 'Analysis Complete',
        description: `Document analysis completed in ${(result.processingTime / 1000).toFixed(1)} seconds.`,
      });

    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Failed to analyze document',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportAnalysis = () => {
    if (!analysis) return;

    const exportData = {
      document: documentName,
      analysisDate: analysis.analysisDate,
      ...analysis
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentName}-analysis.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Analysis Exported',
      description: 'Analysis results have been downloaded as JSON.',
    });
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'non_compliant': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Document Analysis</h3>
          <p className="text-sm text-gray-600">{documentName}</p>
        </div>
        <div className="flex items-center space-x-2">
          {analysis && (
            <Button variant="outline" size="sm" onClick={exportAnalysis}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
          <Button 
            onClick={performAnalysis} 
            disabled={isAnalyzing}
            size="sm"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                {analysis ? 'Re-analyze' : 'Analyze'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Analysis Options */}
      {!analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Analysis Options</CardTitle>
            <CardDescription>
              Configure what types of analysis to perform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="summary"
                  checked={analysisOptions.includeSummary}
                  onCheckedChange={(checked) => 
                    setAnalysisOptions(prev => ({ ...prev, includeSummary: checked }))
                  }
                />
                <Label htmlFor="summary">Document Summary</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="entities"
                  checked={analysisOptions.includeEntities}
                  onCheckedChange={(checked) => 
                    setAnalysisOptions(prev => ({ ...prev, includeEntities: checked }))
                  }
                />
                <Label htmlFor="entities">Entity Extraction</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="insights"
                  checked={analysisOptions.includeInsights}
                  onCheckedChange={(checked) => 
                    setAnalysisOptions(prev => ({ ...prev, includeInsights: checked }))
                  }
                />
                <Label htmlFor="insights">Legal Insights</Label>
              </div>
            </div>
            
            <div>
              <Label htmlFor="custom-prompt">Custom Analysis Instructions (Optional)</Label>
              <Textarea
                id="custom-prompt"
                placeholder="Enter specific instructions for the AI analysis..."
                value={analysisOptions.customPrompt}
                onChange={(e) => 
                  setAnalysisOptions(prev => ({ ...prev, customPrompt: e.target.value }))
                }
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Analysis Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Analysis completed {formatDistanceToNow(new Date(analysis.analysisDate), { addSuffix: true })}
                </span>
                <span>
                  Processing time: {(analysis.processingTime / 1000).toFixed(1)}s
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Summary</span>
              </TabsTrigger>
              <TabsTrigger value="entities" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Entities</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span>Insights</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <SummaryPanel summary={analysis.summary} />
            </TabsContent>

            <TabsContent value="entities" className="space-y-4">
              <EntitiesPanel entities={analysis.entities} />
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <InsightsPanel insights={analysis.insights} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Analyzing document...</span>
              </div>
              <Progress value={undefined} className="w-full" />
              <p className="text-sm text-gray-600">
                This may take a few moments depending on document length and complexity.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Summary Panel Component
const SummaryPanel: React.FC<{ summary: DocumentSummary }> = ({ summary }) => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Document Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 leading-relaxed">{summary.summary}</p>
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Key Points</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {summary.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{point}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Document Type:</span>
            <Badge variant="outline">{summary.documentType}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Word Count:</span>
            <span className="text-sm font-medium">{summary.wordCount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Reading Time:</span>
            <span className="text-sm font-medium">{summary.readingTime} min</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Confidence:</span>
            <span className="text-sm font-medium">{Math.round(summary.confidence * 100)}%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

// Entities Panel Component
const EntitiesPanel: React.FC<{ entities: EntityExtraction }> = ({ entities }) => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Extracted Entities</CardTitle>
        <CardDescription>
          {entities.entities.length} entities found
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entities.entities.map((entity, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <span className="font-medium">{entity.text}</span>
                <Badge variant="outline" className="ml-2">
                  {entity.type.replace('_', ' ')}
                </Badge>
              </div>
              <span className="text-sm text-gray-500">
                {Math.round(entity.confidence * 100)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {entities.relationships.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entity Relationships</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {entities.relationships.map((rel, index) => (
              <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                <span className="font-medium">{rel.entity1}</span>
                <span className="text-gray-600 mx-2">{rel.relationship}</span>
                <span className="font-medium">{rel.entity2}</span>
                <span className="text-gray-500 ml-2">
                  ({Math.round(rel.confidence * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);

// Insights Panel Component
const InsightsPanel: React.FC<{ insights: LegalInsights }> = ({ insights }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document Category</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="default" className="text-base px-3 py-1">
            {insights.documentCategory}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className={`text-base px-3 py-1 ${getRiskColor(insights.riskAssessment.level)}`}>
            {insights.riskAssessment.level.toUpperCase()} RISK
          </Badge>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="text-base">Legal Concepts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {insights.legalConcepts.map((concept, index) => (
            <Badge key={index} variant="outline">
              {concept}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>

    {insights.potentialIssues.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
            Potential Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {insights.potentialIssues.map((issue, index) => (
              <li key={index} className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{issue}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    )}

    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {insights.recommendations.map((rec, index) => (
            <li key={index} className="flex items-start space-x-2">
              <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{rec}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>

    {insights.complianceChecks.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance Checks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.complianceChecks.map((check, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{check.requirement}</span>
                  <div className="flex items-center space-x-1">
                    {getComplianceIcon(check.status)}
                    <span className="text-sm capitalize">{check.status.replace('_', ' ')}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{check.details}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);

function getRiskColor(level: string): string {
  switch (level) {
    case 'low': return 'bg-green-100 text-green-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'high': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export default DocumentAnalysisPanel;
