import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  templateVersionManagementService, 
  type TemplateVersion 
} from '@/lib/services/templateVersionManagement';
import { toast } from '@/components/ui/sonner';
import { 
  GitCompare, 
  ArrowRight, 
  Plus, 
  Minus, 
  Edit, 
  Calendar, 
  User, 
  FileText,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TemplateVersionComparisonProps {
  templateId: string;
  version1Id?: string;
  version2Id?: string;
  onVersionSelect?: (versionId: string) => void;
  className?: string;
}

export const TemplateVersionComparison: React.FC<TemplateVersionComparisonProps> = ({
  templateId,
  version1Id,
  version2Id,
  onVersionSelect,
  className = ''
}) => {
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [selectedVersion1, setSelectedVersion1] = useState<string>(version1Id || '');
  const [selectedVersion2, setSelectedVersion2] = useState<string>(version2Id || '');
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [templateId]);

  useEffect(() => {
    if (selectedVersion1 && selectedVersion2 && selectedVersion1 !== selectedVersion2) {
      compareVersions();
    }
  }, [selectedVersion1, selectedVersion2]);

  const loadVersions = async () => {
    try {
      const versionsData = await templateVersionManagementService.getTemplateVersions(templateId);
      setVersions(versionsData);
      
      // Auto-select current and previous version if not specified
      if (!version1Id && !version2Id && versionsData.length >= 2) {
        setSelectedVersion1(versionsData[0].id); // Most recent
        setSelectedVersion2(versionsData[1].id); // Previous
      }
    } catch (error: any) {
      console.error('Error loading versions:', error);
      toast.error('Failed to load versions');
    }
  };

  const compareVersions = async () => {
    try {
      setLoading(true);
      const comparisonData = await templateVersionManagementService.compareVersions(
        selectedVersion1,
        selectedVersion2
      );
      setComparison(comparisonData);
    } catch (error: any) {
      console.error('Error comparing versions:', error);
      toast.error('Failed to compare versions');
    } finally {
      setLoading(false);
    }
  };

  const getDifferenceIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'removed':
        return <Minus className="h-4 w-4 text-red-500" />;
      case 'modified':
        return <Edit className="h-4 w-4 text-blue-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getDifferenceBadge = (type: string) => {
    const config = {
      added: { variant: 'default' as const, label: 'Added', className: 'bg-green-100 text-green-800' },
      removed: { variant: 'destructive' as const, label: 'Removed', className: 'bg-red-100 text-red-800' },
      modified: { variant: 'secondary' as const, label: 'Modified', className: 'bg-blue-100 text-blue-800' }
    };
    
    const typeConfig = config[type as keyof typeof config];
    return (
      <Badge variant={typeConfig.variant} className={typeConfig.className}>
        {typeConfig.label}
      </Badge>
    );
  };

  const renderVersionCard = (version: TemplateVersion, title: string) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          {title}
          <Badge variant={version.isCurrent ? 'default' : 'secondary'}>
            v{version.versionNumber}
          </Badge>
        </CardTitle>
        <CardDescription>
          {version.changeSummary || 'No change summary available'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Status:</span>
            <Badge variant="outline" className="ml-2">
              {version.status}
            </Badge>
          </div>
          <div>
            <span className="font-medium text-gray-600">Breaking:</span>
            {version.breakingChanges ? (
              <Badge variant="destructive" className="ml-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Yes
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-2">
                <CheckCircle className="h-3 w-3 mr-1" />
                No
              </Badge>
            )}
          </div>
        </div>
        
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            {formatDistanceToNow(version.createdAt, { addSuffix: true })}
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <User className="h-4 w-4" />
            {version.createdBy}
          </div>
        </div>

        <Separator />
        
        <div>
          <h4 className="font-medium text-sm mb-2">Content Preview</h4>
          <div className="text-xs bg-gray-50 p-3 rounded border max-h-24 overflow-y-auto">
            {version.content.substring(0, 150)}
            {version.content.length > 150 && '...'}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderDifferences = () => {
    if (!comparison || !comparison.differences.length) {
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No differences found between the selected versions.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        {comparison.differences.map((diff: any, index: number) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {getDifferenceIcon(diff.type)}
                Field: {diff.field}
                {getDifferenceBadge(diff.type)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diff.type === 'modified' && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-sm text-red-700 mb-2">Before (v{comparison.version1.versionNumber})</h5>
                    <div className="text-xs bg-red-50 border border-red-200 p-3 rounded">
                      {typeof diff.oldValue === 'string' 
                        ? diff.oldValue.substring(0, 200)
                        : JSON.stringify(diff.oldValue, null, 2).substring(0, 200)
                      }
                      {(typeof diff.oldValue === 'string' ? diff.oldValue.length : JSON.stringify(diff.oldValue).length) > 200 && '...'}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-medium text-sm text-green-700 mb-2">After (v{comparison.version2.versionNumber})</h5>
                    <div className="text-xs bg-green-50 border border-green-200 p-3 rounded">
                      {typeof diff.newValue === 'string' 
                        ? diff.newValue.substring(0, 200)
                        : JSON.stringify(diff.newValue, null, 2).substring(0, 200)
                      }
                      {(typeof diff.newValue === 'string' ? diff.newValue.length : JSON.stringify(diff.newValue).length) > 200 && '...'}
                    </div>
                  </div>
                </div>
              )}
              
              {diff.type === 'added' && (
                <div>
                  <h5 className="font-medium text-sm text-green-700 mb-2">Added in v{comparison.version2.versionNumber}</h5>
                  <div className="text-xs bg-green-50 border border-green-200 p-3 rounded">
                    {typeof diff.newValue === 'string' 
                      ? diff.newValue
                      : JSON.stringify(diff.newValue, null, 2)
                    }
                  </div>
                </div>
              )}
              
              {diff.type === 'removed' && (
                <div>
                  <h5 className="font-medium text-sm text-red-700 mb-2">Removed from v{comparison.version1.versionNumber}</h5>
                  <div className="text-xs bg-red-50 border border-red-200 p-3 rounded">
                    {typeof diff.oldValue === 'string' 
                      ? diff.oldValue
                      : JSON.stringify(diff.oldValue, null, 2)
                    }
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Version Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Compare Template Versions
          </CardTitle>
          <CardDescription>
            Select two versions to compare their differences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 items-center">
            <div>
              <label className="block text-sm font-medium mb-2">Version 1</label>
              <Select value={selectedVersion1} onValueChange={setSelectedVersion1}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem key={version.id} value={version.id}>
                      v{version.versionNumber} - {version.changeSummary || 'No summary'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-gray-400" />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Version 2</label>
              <Select value={selectedVersion2} onValueChange={setSelectedVersion2}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem key={version.id} value={version.id}>
                      v{version.versionNumber} - {version.changeSummary || 'No summary'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {selectedVersion1 && selectedVersion2 && selectedVersion1 === selectedVersion2 && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please select two different versions to compare.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Version Details */}
      {comparison && (
        <div className="grid md:grid-cols-2 gap-6">
          {renderVersionCard(comparison.version1, 'Version 1')}
          {renderVersionCard(comparison.version2, 'Version 2')}
        </div>
      )}

      {/* Differences */}
      {comparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Differences</span>
              <Badge variant="outline">
                {comparison.differences.length} change{comparison.differences.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
            <CardDescription>
              Changes between v{comparison.version1.versionNumber} and v{comparison.version2.versionNumber}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                {renderDifferences()}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
