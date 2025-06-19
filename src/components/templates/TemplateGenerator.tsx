import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wand2, 
  Loader2, 
  FileText, 
  Save, 
  Eye,
  Lightbulb,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { generateTemplate, saveGeneratedTemplate, type TemplateGenerationRequest, type GeneratedTemplate } from '@/lib/services/templateGenerator';
import { toast } from '@/components/ui/sonner';

const templateGenerationSchema = z.object({
  type: z.string().min(1, 'Template type is required'),
  party1: z.string().optional(),
  party2: z.string().optional(),
  duration: z.string().optional(),
  amount: z.string().optional(),
  jurisdiction: z.enum(['singapore', 'international']).default('singapore'),
  language: z.enum(['english', 'simplified']).default('english'),
  customRequirements: z.string().optional(),
  saveAsPublic: z.boolean().default(false)
});

type TemplateGenerationFormData = z.infer<typeof templateGenerationSchema>;

interface TemplateGeneratorProps {
  onTemplateGenerated?: (template: GeneratedTemplate) => void;
  className?: string;
}

const TEMPLATE_TYPES = [
  { value: 'service agreement', label: 'Service Agreement' },
  { value: 'employment contract', label: 'Employment Contract' },
  { value: 'non-disclosure agreement', label: 'Non-Disclosure Agreement (NDA)' },
  { value: 'consulting agreement', label: 'Consulting Agreement' },
  { value: 'partnership agreement', label: 'Partnership Agreement' },
  { value: 'lease agreement', label: 'Lease Agreement' },
  { value: 'purchase agreement', label: 'Purchase Agreement' },
  { value: 'terms of service', label: 'Terms of Service' },
  { value: 'privacy policy', label: 'Privacy Policy' },
  { value: 'shareholder agreement', label: 'Shareholder Agreement' },
  { value: 'licensing agreement', label: 'Licensing Agreement' },
  { value: 'distribution agreement', label: 'Distribution Agreement' }
];

export const TemplateGenerator: React.FC<TemplateGeneratorProps> = ({
  onTemplateGenerated,
  className = ''
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState<GeneratedTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TemplateGenerationFormData>({
    resolver: zodResolver(templateGenerationSchema),
    defaultValues: {
      jurisdiction: 'singapore',
      language: 'english',
      saveAsPublic: false
    }
  });

  const watchedType = watch('type');

  const onSubmit = async (data: TemplateGenerationFormData) => {
    setIsGenerating(true);
    
    try {
      const request: TemplateGenerationRequest = {
        type: data.type,
        parties: {
          party1: data.party1,
          party2: data.party2
        },
        terms: {
          duration: data.duration,
          amount: data.amount,
          jurisdiction: data.jurisdiction
        },
        customRequirements: data.customRequirements,
        language: data.language,
        jurisdiction: data.jurisdiction
      };

      const template = await generateTemplate(request);
      setGeneratedTemplate(template);
      setShowPreview(true);
      onTemplateGenerated?.(template);
      
      toast.success('Template generated successfully!');
    } catch (error: any) {
      console.error('Template generation failed:', error);
      toast.error('Failed to generate template: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!generatedTemplate) return;

    try {
      const saveAsPublic = watch('saveAsPublic');
      await saveGeneratedTemplate(generatedTemplate, saveAsPublic);
      toast.success('Template saved successfully!');
    } catch (error: any) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template: ' + error.message);
    }
  };

  const getTemplateDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      'service agreement': 'A contract for providing services between two parties',
      'employment contract': 'An agreement between employer and employee',
      'non-disclosure agreement': 'A confidentiality agreement to protect sensitive information',
      'consulting agreement': 'A contract for consulting services',
      'partnership agreement': 'An agreement between business partners',
      'lease agreement': 'A rental agreement for property',
      'purchase agreement': 'A contract for buying/selling goods or property',
      'terms of service': 'Terms and conditions for using a service or platform',
      'privacy policy': 'A policy explaining how personal data is collected and used',
      'shareholder agreement': 'An agreement between company shareholders'
    };
    return descriptions[type] || 'A legal document template';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wand2 className="h-5 w-5 text-purple-600" />
            <span>AI Template Generator</span>
          </CardTitle>
          <CardDescription>
            Generate custom legal templates using AI. Fill in the details below to create a professional legal document.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Template Details</CardTitle>
            <CardDescription>
              Provide information about the template you want to generate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Template Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Template Type *</Label>
                <Select onValueChange={(value) => setValue('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-red-500 text-sm">{errors.type.message}</p>
                )}
                {watchedType && (
                  <p className="text-sm text-gray-600">
                    {getTemplateDescription(watchedType)}
                  </p>
                )}
              </div>

              {/* Parties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="party1">First Party</Label>
                  <Input
                    {...register('party1')}
                    placeholder="e.g., Service Provider, Employer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="party2">Second Party</Label>
                  <Input
                    {...register('party2')}
                    placeholder="e.g., Client, Employee"
                  />
                </div>
              </div>

              {/* Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration/Term</Label>
                  <Input
                    {...register('duration')}
                    placeholder="e.g., 12 months, 2 years"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount/Value</Label>
                  <Input
                    {...register('amount')}
                    placeholder="e.g., $5,000, SGD 10,000"
                  />
                </div>
              </div>

              {/* Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jurisdiction">Jurisdiction</Label>
                  <Select onValueChange={(value: any) => setValue('jurisdiction', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select jurisdiction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="singapore">Singapore</SelectItem>
                      <SelectItem value="international">International</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language Style</Label>
                  <Select onValueChange={(value: any) => setValue('language', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">Standard Legal</SelectItem>
                      <SelectItem value="simplified">Plain English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom Requirements */}
              <div className="space-y-2">
                <Label htmlFor="customRequirements">Additional Requirements</Label>
                <Textarea
                  {...register('customRequirements')}
                  placeholder="Describe any specific clauses, terms, or requirements you need..."
                  rows={3}
                />
              </div>

              {/* Save Options */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="saveAsPublic"
                  onCheckedChange={(checked) => setValue('saveAsPublic', !!checked)}
                />
                <Label htmlFor="saveAsPublic" className="text-sm">
                  Make this template public for other users
                </Label>
              </div>

              {/* Generate Button */}
              <Button 
                type="submit" 
                disabled={isGenerating} 
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Template...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Template
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preview/Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Generated Template</CardTitle>
                <CardDescription>
                  Preview and save your AI-generated template
                </CardDescription>
              </div>
              {generatedTemplate && (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </Button>
                  <Button size="sm" onClick={handleSaveTemplate}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!generatedTemplate ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No template generated yet
                </h3>
                <p className="text-gray-500">
                  Fill in the form and click "Generate Template" to create your custom legal document.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Template Info */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h4 className="font-medium text-green-900">{generatedTemplate.name}</h4>
                  </div>
                  <p className="text-sm text-green-700 mb-2">{generatedTemplate.description}</p>
                  <div className="flex items-center space-x-4 text-xs text-green-600">
                    <span>Category: {generatedTemplate.category}</span>
                    <span>Variables: {generatedTemplate.variables.length}</span>
                    <span>Confidence: {Math.round(generatedTemplate.confidence * 100)}%</span>
                  </div>
                </div>

                {/* Variables */}
                {generatedTemplate.variables.length > 0 && (
                  <div>
                    <h5 className="font-medium text-sm mb-2">Template Variables:</h5>
                    <div className="flex flex-wrap gap-1">
                      {generatedTemplate.variables.map((variable, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                        >
                          {variable}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview */}
                {showPreview && (
                  <div>
                    <h5 className="font-medium text-sm mb-2">Template Content:</h5>
                    <div className="max-h-64 overflow-y-auto p-3 bg-gray-50 rounded border text-sm">
                      <pre className="whitespace-pre-wrap font-mono">
                        {generatedTemplate.content}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Confidence Warning */}
                {generatedTemplate.confidence < 0.7 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This template was generated with lower confidence. Please review carefully and consider consulting a legal professional.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center space-x-2">
            <Lightbulb className="h-4 w-4" />
            <span>Tips for Better Templates</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Be specific about the type of agreement you need</li>
            <li>• Provide clear party descriptions (e.g., "Software Company" vs "Company A")</li>
            <li>• Include specific terms like duration, amounts, and key obligations</li>
            <li>• Mention any special requirements or unique clauses needed</li>
            <li>• Choose the appropriate jurisdiction for your use case</li>
            <li>• Use "Plain English" style for simpler, more readable templates</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
