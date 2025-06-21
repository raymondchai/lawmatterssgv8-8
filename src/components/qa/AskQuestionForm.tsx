import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  X,
  Plus,
  AlertTriangle,
  Info,
  HelpCircle,
  Lightbulb,
  Shield
} from 'lucide-react';
import { legalQAApi } from '@/lib/api/legalQA';
import type { LegalQACategory, LegalQuestion } from '@/types';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';

interface AskQuestionFormProps {
  onClose: () => void;
  onQuestionCreated: (question: LegalQuestion) => void;
  initialCategory?: string;
}

export const AskQuestionForm: React.FC<AskQuestionFormProps> = ({
  onClose,
  onQuestionCreated,
  initialCategory
}) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<LegalQACategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTag, setCurrentTag] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category_id: initialCategory || '',
    tags: [] as string[],
    urgency_level: 'normal' as const,
    location: 'Singapore',
    is_anonymous: false
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categoriesData = await legalQAApi.getCategories();
      setCategories(categoriesData);
    } catch (error: any) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please log in to ask a question');
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const questionData = {
        ...formData,
        user_id: user.id,
        status: 'open' as const,
        view_count: 0,
        upvote_count: 0,
        downvote_count: 0,
        answer_count: 0,
        has_expert_answer: false,
        has_ai_answer: false,
        featured: false
      };

      const newQuestion = await legalQAApi.createQuestion(questionData);
      
      toast.success('Question submitted successfully! It will be reviewed before being published.');
      onQuestionCreated(newQuestion);
    } catch (error: any) {
      console.error('Error creating question:', error);
      toast.error('Failed to submit question. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Ask a Legal Question</CardTitle>
            <CardDescription>
              Get help from the community and legal experts
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Important Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 mb-1">Important Legal Disclaimer</p>
                  <p className="text-yellow-700">
                    This platform provides general information only and does not constitute legal advice. 
                    For specific legal matters, please consult with a qualified legal professional.
                  </p>
                </div>
              </div>
            </div>

            {/* Question Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Question Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Briefly describe your legal question..."
                maxLength={200}
                required
              />
              <p className="text-xs text-gray-500">
                {formData.title.length}/200 characters
              </p>
            </div>

            {/* Question Details */}
            <div className="space-y-2">
              <Label htmlFor="content">Question Details *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="Provide detailed information about your legal question. Include relevant facts, dates, and any specific circumstances..."
                rows={8}
                maxLength={5000}
                required
              />
              <p className="text-xs text-gray-500">
                {formData.content.length}/5000 characters
              </p>
            </div>

            {/* Category and Urgency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => handleInputChange('category_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgency">Urgency Level</Label>
                <Select
                  value={formData.urgency_level}
                  onValueChange={(value: any) => handleInputChange('urgency_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - General inquiry</SelectItem>
                    <SelectItem value="normal">Normal - Standard question</SelectItem>
                    <SelectItem value="high">High - Time-sensitive</SelectItem>
                    <SelectItem value="urgent">Urgent - Immediate attention needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., Singapore, Orchard Road"
              />
              <p className="text-xs text-gray-500">
                Specify location if relevant to your legal question
              </p>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (Optional)</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex space-x-2">
                <Input
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add tags to help categorize your question..."
                  maxLength={30}
                />
                <Button type="button" onClick={addTag} variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Add relevant tags like "contract", "employment", "property", etc.
              </p>
            </div>

            {/* Privacy Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="anonymous"
                  checked={formData.is_anonymous}
                  onCheckedChange={(checked) => handleInputChange('is_anonymous', checked)}
                />
                <label htmlFor="anonymous" className="text-sm text-gray-700">
                  Post anonymously
                </label>
              </div>
              <p className="text-xs text-gray-500 ml-6">
                Your name will not be displayed with this question
              </p>
            </div>

            {/* Guidelines */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 mb-2">Tips for Better Answers</p>
                  <ul className="text-blue-700 space-y-1 text-xs">
                    <li>• Be specific about your situation and provide relevant details</li>
                    <li>• Include relevant dates, amounts, and parties involved</li>
                    <li>• Mention any documents or agreements related to your question</li>
                    <li>• Avoid sharing personal identifying information</li>
                    <li>• Use clear, simple language to describe your situation</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || !formData.title.trim() || !formData.content.trim()}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Submit Question
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
