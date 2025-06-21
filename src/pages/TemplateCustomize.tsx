import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { templateMarketplaceService, type Template, type TemplateField, type TemplateCustomization } from '@/lib/services/templateMarketplace';
import { supabase } from '@/lib/supabase';
import { ROUTES } from '@/lib/config/constants';
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Eye, 
  FileText, 
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';

export default function TemplateCustomize() {
  const { templateSlug } = useParams<{ templateSlug: string }>();
  const navigate = useNavigate();
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [customization, setCustomization] = useState<TemplateCustomization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [previewMode, setPreviewMode] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<string>('');

  useEffect(() => {
    if (templateSlug) {
      loadTemplate(templateSlug);
    }
  }, [templateSlug]);

  const loadTemplate = async (slug: string) => {
    try {
      setLoading(true);
      const templateData = await templateMarketplaceService.getTemplate(slug);
      
      if (!templateData) {
        setError('Template not found');
        return;
      }

      setTemplate(templateData);
      
      // Initialize form data with default values
      const initialData: Record<string, any> = {};
      templateData.fields.forEach(field => {
        if (field.defaultValue !== undefined) {
          initialData[field.name] = field.defaultValue;
        }
      });
      setFormData(initialData);

      // Track customization start
      await templateMarketplaceService.trackEvent(templateData.id, 'customization_started', {
        source: 'customize_page',
        access_level: templateData.accessLevel
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const validateField = (field: TemplateField, value: any): string | null => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return `${field.label} is required`;
    }

    if (value && field.validation) {
      const validation = field.validation;
      
      if (validation.minLength && value.toString().length < validation.minLength) {
        return `${field.label} must be at least ${validation.minLength} characters`;
      }
      
      if (validation.maxLength && value.toString().length > validation.maxLength) {
        return `${field.label} must be no more than ${validation.maxLength} characters`;
      }
      
      if (validation.pattern && !new RegExp(validation.pattern).test(value.toString())) {
        return `${field.label} format is invalid`;
      }
      
      if (field.type === 'number') {
        const numValue = Number(value);
        if (validation.min && numValue < validation.min) {
          return `${field.label} must be at least ${validation.min}`;
        }
        if (validation.max && numValue > validation.max) {
          return `${field.label} must be no more than ${validation.max}`;
        }
      }
    }

    return null;
  };

  const validateForm = (): boolean => {
    if (!template) return false;
    
    const errors: Record<string, string> = {};
    
    template.fields.forEach(field => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        errors[field.name] = error;
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleSave = async () => {
    if (!template || !validateForm()) return;
    
    try {
      setSaving(true);
      
      if (customization) {
        // Update existing customization
        const updated = await templateMarketplaceService.updateCustomization(customization.id, {
          customFields: formData
        });
        setCustomization(updated);
      } else {
        // Create new customization
        const sessionId = crypto.randomUUID();
        const newCustomization = await templateMarketplaceService.createCustomization(
          template.id,
          formData,
          undefined, // userId - will be set if user is logged in
          sessionId
        );
        setCustomization(newCustomization);
      }
      
      // Track save event
      await templateMarketplaceService.trackEvent(template.id, 'customization_saved', {
        fields_filled: Object.keys(formData).length,
        completion_rate: (Object.keys(formData).length / template.fields.length) * 100
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customization');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!template || !validateForm()) return;
    
    try {
      setGenerating(true);
      
      // Generate preview by replacing placeholders in template content
      let preview = template.content.template || '';
      
      Object.entries(formData).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        preview = preview.replace(placeholder, value?.toString() || '');
      });
      
      setGeneratedPreview(preview);
      setPreviewMode(true);
      
      // Track preview event
      await templateMarketplaceService.trackEvent(template.id, 'preview_generated', {
        fields_filled: Object.keys(formData).length
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (format: 'pdf' | 'docx' | 'html' = 'pdf') => {
    if (!template || !customization) return;

    try {
      setGenerating(true);

      // Call the document generation Edge Function
      const { data, error } = await supabase.functions.invoke('template-document-generator', {
        body: {
          customizationId: customization.id,
          format,
          templateData: {
            title: template.title,
            content: template.content.template || '',
            customFields: formData
          }
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate document');
      }

      // Create download link
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = `${template.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Track download
      await templateMarketplaceService.recordDownload(
        template.id,
        customization.id,
        format
      );

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download document');
    } finally {
      setGenerating(false);
    }
  };

  const renderField = (field: TemplateField) => {
    const value = formData[field.name] || '';
    const error = validationErrors[field.name];
    
    const commonProps = {
      id: field.id,
      value,
      onChange: (e: any) => handleFieldChange(field.name, e.target.value),
      placeholder: field.placeholder,
      className: error ? 'border-red-500' : ''
    };

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            rows={4}
          />
        );
      
      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleFieldChange(field.name, val)}>
            <SelectTrigger className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value === true}
              onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
            />
            <Label htmlFor={field.id}>{field.label}</Label>
          </div>
        );
      
      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
            min={field.validation?.min}
            max={field.validation?.max}
            onChange={(e) => handleFieldChange(field.name, Number(e.target.value))}
          />
        );
      
      case 'date':
        return (
          <Input
            {...commonProps}
            type="date"
          />
        );
      
      case 'email':
        return (
          <Input
            {...commonProps}
            type="email"
          />
        );
      
      case 'phone':
        return (
          <Input
            {...commonProps}
            type="tel"
          />
        );
      
      default:
        return (
          <Input
            {...commonProps}
            type="text"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-8 w-32" />
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Template</h3>
            <p className="text-gray-600 mb-6">
              {error || 'The template you\'re trying to customize is not available.'}
            </p>
            <Button onClick={() => navigate(ROUTES.templateBrowser)}>
              Browse Templates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(`${ROUTES.templatePreview}/${template.slug}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Preview
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Customize: {template.title}
                </h1>
                <p className="text-gray-600">
                  Fill in the fields below to customize your document
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline">{template.category?.name}</Badge>
              {template.accessLevel !== 'public' && (
                <Badge variant="secondary">{template.accessLevel}</Badge>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Form */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Document Fields
                  </CardTitle>
                  <CardDescription>
                    Complete the form below to customize your document
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {template.fields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id} className="flex items-center gap-2">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      
                      {renderField(field)}
                      
                      {field.helpText && (
                        <p className="text-xs text-gray-500">{field.helpText}</p>
                      )}
                      
                      {validationErrors[field.name] && (
                        <p className="text-xs text-red-500">{validationErrors[field.name]}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Progress
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={handlePreview}
                      disabled={generating}
                      className="flex-1"
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      Preview
                    </Button>
                    
                    <div className="flex gap-2 flex-1">
                      <Button
                        variant="outline"
                        onClick={() => handleDownload('pdf')}
                        disabled={!customization || generating}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDownload('docx')}
                        disabled={!customization || generating}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        DOCX
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDownload('html')}
                        disabled={!customization || generating}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        HTML
                      </Button>
                    </div>
                  </div>
                  
                  {Object.keys(validationErrors).length > 0 && (
                    <Alert className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Please fix the validation errors above before proceeding.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Preview */}
            <div className="space-y-6">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Live Preview
                  </CardTitle>
                  <CardDescription>
                    See how your document will look as you fill in the fields
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {previewMode && generatedPreview ? (
                    <div 
                      className="prose max-w-none border rounded-lg p-4 bg-white min-h-96 text-sm"
                      dangerouslySetInnerHTML={{ __html: generatedPreview }}
                    />
                  ) : template.previewHtml ? (
                    <div 
                      className="prose max-w-none border rounded-lg p-4 bg-white min-h-96 text-sm opacity-60"
                      dangerouslySetInnerHTML={{ __html: template.previewHtml }}
                    />
                  ) : (
                    <div className="border rounded-lg p-8 bg-white min-h-96 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Fill in the fields to see your customized document</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
