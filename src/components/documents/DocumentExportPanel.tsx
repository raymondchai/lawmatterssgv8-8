import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  FileText, 
  Package, 
  Settings, 
  Loader2,
  Plus,
  Eye,
  Share
} from 'lucide-react';
import { 
  documentExportService, 
  type ExportOptions, 
  type CustomDocumentRequest 
} from '@/lib/services/documentExport';
import { useFeatureAvailability } from '@/hooks/useUsageTracking';
import { useToast } from '@/hooks/use-toast';

interface DocumentExportPanelProps {
  documentId?: string;
  documentName?: string;
  selectedDocuments?: string[];
  onExportComplete?: () => void;
}

const DocumentExportPanel: React.FC<DocumentExportPanelProps> = ({
  documentId,
  documentName,
  selectedDocuments = [],
  onExportComplete
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeAnalysis: false,
    includeMetadata: true
  });
  const [customDocRequest, setCustomDocRequest] = useState<CustomDocumentRequest>({
    templateType: 'contract',
    title: '',
    content: '',
    variables: {},
    formatting: {
      fontSize: 12,
      fontFamily: 'Arial',
      margins: { top: 1, bottom: 1, left: 1, right: 1 }
    }
  });
  const [activeTab, setActiveTab] = useState('download');

  const { canDownloadCustomDocuments, customDocUsage } = useFeatureAvailability();
  const { toast } = useToast();

  const handleDownload = async () => {
    if (!documentId) return;

    try {
      setIsExporting(true);
      
      const result = await documentExportService.downloadDocument(documentId, exportOptions);
      
      // Create download link
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download Started',
        description: `Downloading ${result.filename} (${(result.size / 1024 / 1024).toFixed(2)} MB)`,
      });

      if (onExportComplete) {
        onExportComplete();
      }

    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export document',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleBulkExport = async () => {
    if (selectedDocuments.length === 0) return;

    try {
      setIsExporting(true);
      
      const result = await documentExportService.bulkExport(selectedDocuments, exportOptions);
      
      // Create download link
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Bulk Export Complete',
        description: `Downloaded ${selectedDocuments.length} documents as ZIP archive`,
      });

      if (onExportComplete) {
        onExportComplete();
      }

    } catch (error) {
      console.error('Bulk export failed:', error);
      toast({
        title: 'Bulk Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export documents',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCustomDocumentGeneration = async () => {
    if (!customDocRequest.title || !customDocRequest.content) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both title and content for the custom document.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsExporting(true);
      
      const result = await documentExportService.generateCustomDocument(
        customDocRequest,
        exportOptions
      );
      
      // Create download link
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Custom Document Generated',
        description: `Generated ${result.filename} successfully`,
      });

      if (onExportComplete) {
        onExportComplete();
      }

    } catch (error) {
      console.error('Custom document generation failed:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate custom document',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleAnalysisExport = async () => {
    if (!documentId) return;

    try {
      setIsExporting(true);
      
      const result = await documentExportService.exportAnalysis(documentId, exportOptions);
      
      // Create download link
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Analysis Exported',
        description: `Exported analysis as ${result.filename}`,
      });

      if (onExportComplete) {
        onExportComplete();
      }

    } catch (error) {
      console.error('Analysis export failed:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export analysis',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Download className="h-5 w-5 mr-2" />
          Document Export & Generation
        </CardTitle>
        <CardDescription>
          Download documents, export analysis, or generate custom documents
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="download" className="flex items-center space-x-1">
              <Download className="h-4 w-4" />
              <span>Download</span>
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center space-x-1">
              <Package className="h-4 w-4" />
              <span>Bulk</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>Analysis</span>
            </TabsTrigger>
            <TabsTrigger 
              value="custom" 
              className="flex items-center space-x-1"
              disabled={!canDownloadCustomDocuments}
            >
              <Plus className="h-4 w-4" />
              <span>Custom</span>
            </TabsTrigger>
          </TabsList>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Export Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="format">Format</Label>
                  <Select
                    value={exportOptions.format}
                    onValueChange={(value) => 
                      setExportOptions(prev => ({ ...prev, format: value as any }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="docx">Word Document</SelectItem>
                      <SelectItem value="txt">Text File</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-analysis"
                    checked={exportOptions.includeAnalysis}
                    onCheckedChange={(checked) => 
                      setExportOptions(prev => ({ ...prev, includeAnalysis: checked }))
                    }
                  />
                  <Label htmlFor="include-analysis">Include Analysis</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-metadata"
                    checked={exportOptions.includeMetadata}
                    onCheckedChange={(checked) => 
                      setExportOptions(prev => ({ ...prev, includeMetadata: checked }))
                    }
                  />
                  <Label htmlFor="include-metadata">Include Metadata</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <TabsContent value="download" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Download Document</CardTitle>
                <CardDescription>
                  {documentName ? `Download: ${documentName}` : 'Select a document to download'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleDownload}
                  disabled={!documentId || isExporting}
                  className="w-full"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download Document
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bulk Export</CardTitle>
                <CardDescription>
                  Export multiple documents as a ZIP archive
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
                  </div>
                  <Button 
                    onClick={handleBulkExport}
                    disabled={selectedDocuments.length === 0 || isExporting}
                    className="w-full"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Package className="h-4 w-4 mr-2" />
                        Export Selected Documents
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Export Analysis</CardTitle>
                <CardDescription>
                  Export document analysis results as a standalone report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleAnalysisExport}
                  disabled={!documentId || isExporting}
                  className="w-full"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Export Analysis Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            {!canDownloadCustomDocuments ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="text-gray-500">
                      Custom document generation is not available on your current plan.
                    </div>
                    <Button variant="outline">
                      Upgrade Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Usage Information */}
                {customDocUsage && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between text-sm">
                        <span>Custom Documents Used:</span>
                        <Badge variant="outline">
                          {customDocUsage.current}/{customDocUsage.limit === -1 ? '∞' : customDocUsage.limit}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Generate Custom Document</CardTitle>
                    <CardDescription>
                      Create a new document using AI-powered templates
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="template-type">Template Type</Label>
                        <Select
                          value={customDocRequest.templateType}
                          onValueChange={(value) => 
                            setCustomDocRequest(prev => ({ ...prev, templateType: value as any }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="agreement">Agreement</SelectItem>
                            <SelectItem value="letter">Letter</SelectItem>
                            <SelectItem value="memo">Memo</SelectItem>
                            <SelectItem value="report">Report</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="title">Document Title</Label>
                        <Input
                          id="title"
                          value={customDocRequest.title}
                          onChange={(e) => 
                            setCustomDocRequest(prev => ({ ...prev, title: e.target.value }))
                          }
                          placeholder="Enter document title..."
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="content">Content Requirements</Label>
                      <Textarea
                        id="content"
                        value={customDocRequest.content}
                        onChange={(e) => 
                          setCustomDocRequest(prev => ({ ...prev, content: e.target.value }))
                        }
                        placeholder="Describe what the document should contain..."
                        rows={6}
                      />
                    </div>

                    <Button 
                      onClick={handleCustomDocumentGeneration}
                      disabled={isExporting || !customDocRequest.title || !customDocRequest.content}
                      className="w-full"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Generate Custom Document
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DocumentExportPanel;
