import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Download, 
  Save, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Wand2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import type { Template } from '@/types';
import { toast } from '@/components/ui/sonner';

interface TemplateCustomizerProps {
  template: Template;
  onSave?: (customizedContent: string, variables: Record<string, string>) => void;
  onDownload?: (content: string, filename: string) => void;
  className?: string;
}

interface TemplateVariable {
  name: string;
  value: string;
  required: boolean;
  type: 'text' | 'date' | 'number' | 'email';
  placeholder?: string;
  description?: string;
}

export const TemplateCustomizer: React.FC<TemplateCustomizerProps> = ({
  template,
  onSave,
  onDownload,
  className = ''
}) => {
  const [customizedContent, setCustomizedContent] = useState(template.content);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    extractVariables();
  }, [template]);

  useEffect(() => {
    generateCustomizedContent();
  }, [variables, template.content]);

  const extractVariables = () => {
    // Extract variables from template content (format: {{variable_name}})
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const matches = template.content.match(variableRegex) || [];
    const uniqueVariables = [...new Set(matches.map(match => match.replace(/[{}]/g, '')))];

    const extractedVariables: TemplateVariable[] = uniqueVariables.map(varName => {
      const cleanName = varName.trim();
      return {
        name: cleanName,
        value: '',
        required: true,
        type: getVariableType(cleanName),
        placeholder: getVariablePlaceholder(cleanName),
        description: getVariableDescription(cleanName)
      };
    });

    setTemplateVariables(extractedVariables);
    
    // Initialize variables object
    const initialVariables: Record<string, string> = {};
    extractedVariables.forEach(variable => {
      initialVariables[variable.name] = '';
    });
    setVariables(initialVariables);
  };

  const getVariableType = (varName: string): 'text' | 'date' | 'number' | 'email' => {
    const name = varName.toLowerCase();
    if (name.includes('date') || name.includes('time')) return 'date';
    if (name.includes('email') || name.includes('mail')) return 'email';
    if (name.includes('amount') || name.includes('price') || name.includes('cost')) return 'number';
    return 'text';
  };

  const getVariablePlaceholder = (varName: string): string => {
    const name = varName.toLowerCase();
    if (name.includes('name')) return 'Enter full name';
    if (name.includes('company')) return 'Enter company name';
    if (name.includes('address')) return 'Enter address';
    if (name.includes('date')) return 'Select date';
    if (name.includes('email')) return 'Enter email address';
    if (name.includes('phone')) return 'Enter phone number';
    if (name.includes('amount') || name.includes('price')) return 'Enter amount';
    return `Enter ${varName.replace(/_/g, ' ').toLowerCase()}`;
  };

  const getVariableDescription = (varName: string): string => {
    const name = varName.toLowerCase();
    if (name.includes('party1') || name.includes('first_party')) return 'First party to the agreement';
    if (name.includes('party2') || name.includes('second_party')) return 'Second party to the agreement';
    if (name.includes('effective_date')) return 'Date when the agreement becomes effective';
    if (name.includes('termination_date')) return 'Date when the agreement terminates';
    if (name.includes('governing_law')) return 'Jurisdiction governing this agreement';
    return `Value for ${varName.replace(/_/g, ' ').toLowerCase()}`;
  };

  const generateCustomizedContent = () => {
    let content = template.content;
    
    // Replace variables in content
    templateVariables.forEach(variable => {
      const placeholder = `{{${variable.name}}}`;
      const value = variables[variable.name] || `[${variable.name.toUpperCase()}]`;
      content = content.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });

    setCustomizedContent(content);
  };

  const handleVariableChange = (variableName: string, value: string) => {
    setVariables(prev => ({
      ...prev,
      [variableName]: value
    }));
  };

  const handleSave = () => {
    onSave?.(customizedContent, variables);
    toast.success('Template customization saved');
  };

  const handleDownload = () => {
    const filename = `${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_customized.docx`;
    onDownload?.(customizedContent, filename);
    toast.success('Template downloaded');
  };

  const resetVariables = () => {
    const resetVars: Record<string, string> = {};
    templateVariables.forEach(variable => {
      resetVars[variable.name] = '';
    });
    setVariables(resetVars);
    toast.success('Variables reset');
  };

  const getCompletionStatus = () => {
    const totalVariables = templateVariables.length;
    const completedVariables = templateVariables.filter(v => variables[v.name]?.trim()).length;
    return { total: totalVariables, completed: completedVariables };
  };

  const { total, completed } = getCompletionStatus();
  const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 100;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Customize Template</span>
              </CardTitle>
              <CardDescription>
                {template.name} - Fill in the variables to customize your document
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={completionPercentage === 100 ? 'default' : 'secondary'}>
                {completed}/{total} completed
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Variables Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Template Variables</CardTitle>
            <CardDescription>
              Fill in the required information to customize your document
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {templateVariables.length > 0 ? (
              <>
                {templateVariables.map((variable) => (
                  <div key={variable.name} className="space-y-2">
                    <Label htmlFor={variable.name} className="flex items-center space-x-2">
                      <span>{variable.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      {variable.required && <span className="text-red-500">*</span>}
                    </Label>
                    
                    {variable.type === 'date' ? (
                      <Input
                        id={variable.name}
                        type="date"
                        value={variables[variable.name] || ''}
                        onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        className="w-full"
                      />
                    ) : variable.type === 'email' ? (
                      <Input
                        id={variable.name}
                        type="email"
                        placeholder={variable.placeholder}
                        value={variables[variable.name] || ''}
                        onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        className="w-full"
                      />
                    ) : variable.type === 'number' ? (
                      <Input
                        id={variable.name}
                        type="number"
                        placeholder={variable.placeholder}
                        value={variables[variable.name] || ''}
                        onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        className="w-full"
                      />
                    ) : (
                      <Input
                        id={variable.name}
                        type="text"
                        placeholder={variable.placeholder}
                        value={variables[variable.name] || ''}
                        onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        className="w-full"
                      />
                    )}
                    
                    {variable.description && (
                      <p className="text-xs text-gray-500">{variable.description}</p>
                    )}
                  </div>
                ))}

                <Separator />

                <div className="flex space-x-2">
                  <Button variant="outline" onClick={resetVariables} className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button onClick={handleSave} disabled={completed === 0} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button onClick={handleDownload} disabled={completed === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No variables found in this template. You can download it as-is or modify the content directly.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        {showPreview && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Document Preview</CardTitle>
              <CardDescription>
                Live preview of your customized document
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg">
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                    {customizedContent}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Completion Status */}
      {templateVariables.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {completionPercentage === 100 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                <span className="text-sm font-medium">
                  {completionPercentage === 100 
                    ? 'All variables completed - ready to download!' 
                    : `${total - completed} variable${total - completed === 1 ? '' : 's'} remaining`
                  }
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {completionPercentage}% complete
              </div>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
