import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  templateVersionManagementService, 
  type CreateVersionParams 
} from '@/lib/services/templateVersionManagement';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';
import { 
  Plus, 
  GitBranch, 
  AlertTriangle, 
  Info, 
  Save,
  FileText,
  Tag,
  Zap
} from 'lucide-react';

interface TemplateVersionCreatorProps {
  templateId: string;
  currentTitle: string;
  currentDescription?: string;
  currentContent: string;
  currentFields: any[];
  onVersionCreated?: (versionId: string) => void;
  className?: string;
}

export const TemplateVersionCreator: React.FC<TemplateVersionCreatorProps> = ({
  templateId,
  currentTitle,
  currentDescription,
  currentContent,
  currentFields,
  onVersionCreated,
  className = ''
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: currentTitle,
    description: currentDescription || '',
    content: currentContent,
    fields: currentFields,
    changeSummary: '',
    changeDetails: '',
    breakingChanges: false,
    versionType: 'minor' as 'major' | 'minor' | 'patch'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please log in to create a new version');
      return;
    }

    if (!formData.changeSummary.trim()) {
      toast.error('Please provide a change summary');
      return;
    }

    try {
      setLoading(true);

      const params: CreateVersionParams = {
        templateId,
        title: formData.title,
        description: formData.description || undefined,
        content: formData.content,
        fields: formData.fields,
        changeSummary: formData.changeSummary,
        changeDetails: formData.changeDetails ? { notes: formData.changeDetails } : undefined,
        breakingChanges: formData.breakingChanges,
        versionType: formData.versionType
      };

      const versionId = await templateVersionManagementService.createVersion(params, user.id);
      
      toast.success('New template version created successfully!');
      setIsOpen(false);
      onVersionCreated?.(versionId);
      
      // Reset form
      setFormData({
        title: currentTitle,
        description: currentDescription || '',
        content: currentContent,
        fields: currentFields,
        changeSummary: '',
        changeDetails: '',
        breakingChanges: false,
        versionType: 'minor'
      });

    } catch (error: any) {
      console.error('Error creating version:', error);
      toast.error('Failed to create version: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getVersionTypeInfo = (type: string) => {
    const info = {
      major: {
        icon: <Tag className="h-4 w-4 text-red-500" />,
        label: 'Major Version',
        description: 'Breaking changes, new features, or significant updates',
        example: '1.0.0 → 2.0.0'
      },
      minor: {
        icon: <GitBranch className="h-4 w-4 text-blue-500" />,
        label: 'Minor Version',
        description: 'New features or improvements without breaking changes',
        example: '1.0.0 → 1.1.0'
      },
      patch: {
        icon: <FileText className="h-4 w-4 text-green-500" />,
        label: 'Patch Version',
        description: 'Bug fixes, small improvements, or corrections',
        example: '1.0.0 → 1.0.1'
      }
    };
    return info[type as keyof typeof info];
  };

  return (
    <div className={className}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Version
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Create New Template Version
            </DialogTitle>
            <DialogDescription>
              Create a new version of this template with your changes and improvements.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Version Type Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Version Type</Label>
              <Select 
                value={formData.versionType} 
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, versionType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select version type" />
                </SelectTrigger>
                <SelectContent>
                  {(['major', 'minor', 'patch'] as const).map((type) => {
                    const info = getVersionTypeInfo(type);
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          {info.icon}
                          <div>
                            <div className="font-medium">{info.label}</div>
                            <div className="text-xs text-gray-500">{info.example}</div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              {formData.versionType && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {getVersionTypeInfo(formData.versionType).description}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Change Summary */}
            <div className="space-y-2">
              <Label htmlFor="changeSummary" className="text-base font-medium">
                Change Summary *
              </Label>
              <Input
                id="changeSummary"
                value={formData.changeSummary}
                onChange={(e) => setFormData(prev => ({ ...prev, changeSummary: e.target.value }))}
                placeholder="Brief description of what changed in this version"
                required
              />
            </div>

            {/* Change Details */}
            <div className="space-y-2">
              <Label htmlFor="changeDetails" className="text-base font-medium">
                Detailed Changes (Optional)
              </Label>
              <Textarea
                id="changeDetails"
                value={formData.changeDetails}
                onChange={(e) => setFormData(prev => ({ ...prev, changeDetails: e.target.value }))}
                placeholder="Detailed description of changes, new features, bug fixes, etc."
                rows={4}
              />
            </div>

            {/* Breaking Changes */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="breakingChanges"
                checked={formData.breakingChanges}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, breakingChanges: checked as boolean }))
                }
              />
              <Label htmlFor="breakingChanges" className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-red-500" />
                This version contains breaking changes
              </Label>
            </div>

            {formData.breakingChanges && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Breaking changes may affect existing customizations or integrations. 
                  Make sure to document migration steps in the detailed changes.
                </AlertDescription>
              </Alert>
            )}

            {/* Template Content Preview */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Template Content</Label>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{formData.title}</CardTitle>
                  {formData.description && (
                    <CardDescription className="text-xs">
                      {formData.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                    {formData.content.substring(0, 200)}
                    {formData.content.length > 200 && '...'}
                  </div>
                  {formData.fields.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        Fields: {formData.fields.length}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {formData.fields.slice(0, 5).map((field, index) => (
                          <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {field.label || field.name || `Field ${index + 1}`}
                          </span>
                        ))}
                        {formData.fields.length > 5 && (
                          <span className="text-xs text-gray-500">
                            +{formData.fields.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                disabled={loading || !formData.changeSummary.trim()}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Creating Version...' : 'Create Version'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
