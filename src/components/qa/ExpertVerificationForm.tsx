import React, { useState } from 'react';
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
  Upload,
  Award,
  GraduationCap,
  Building,
  FileText,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { legalQAApi } from '@/lib/api/legalQA';
import type { LegalExpert } from '@/types';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ExpertVerificationFormProps {
  onClose: () => void;
  onApplicationSubmitted: (expert: LegalExpert) => void;
}

export const ExpertVerificationForm: React.FC<ExpertVerificationFormProps> = ({
  onClose,
  onApplicationSubmitted
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentSpecialization, setCurrentSpecialization] = useState('');
  const [currentEducation, setCurrentEducation] = useState('');
  const [currentCertification, setCurrentCertification] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState('');

  const [formData, setFormData] = useState({
    bar_number: '',
    specializations: [] as string[],
    years_experience: '',
    education: [] as string[],
    certifications: [] as string[],
    languages: ['English'] as string[],
    bio: '',
    law_firm_id: '',
    verification_documents: [] as string[],
    consent_verification: false,
    consent_public_profile: false,
    consent_answer_questions: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please log in to apply for expert verification');
      return;
    }

    if (!formData.consent_verification || !formData.consent_public_profile) {
      toast.error('Please provide required consents');
      return;
    }

    if (formData.specializations.length === 0) {
      toast.error('Please add at least one specialization');
      return;
    }

    try {
      setLoading(true);
      
      const expertData = {
        user_id: user.id,
        bar_number: formData.bar_number || undefined,
        specializations: formData.specializations,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : undefined,
        education: formData.education,
        certifications: formData.certifications,
        languages: formData.languages,
        bio: formData.bio || undefined,
        law_firm_id: formData.law_firm_id || undefined,
        verification_documents: formData.verification_documents,
        is_active: true
      };

      const newExpert = await legalQAApi.createExpertProfile(expertData);
      
      toast.success('Expert verification application submitted successfully! We will review your application and contact you within 5-7 business days.');
      onApplicationSubmitted(newExpert);
    } catch (error: any) {
      console.error('Error submitting expert application:', error);
      toast.error('Failed to submit application. Please try again.');
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

  const addSpecialization = () => {
    if (currentSpecialization.trim() && !formData.specializations.includes(currentSpecialization.trim())) {
      setFormData(prev => ({
        ...prev,
        specializations: [...prev.specializations, currentSpecialization.trim()]
      }));
      setCurrentSpecialization('');
    }
  };

  const removeSpecialization = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.filter(s => s !== spec)
    }));
  };

  const addEducation = () => {
    if (currentEducation.trim() && !formData.education.includes(currentEducation.trim())) {
      setFormData(prev => ({
        ...prev,
        education: [...prev.education, currentEducation.trim()]
      }));
      setCurrentEducation('');
    }
  };

  const removeEducation = (edu: string) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter(e => e !== edu)
    }));
  };

  const addCertification = () => {
    if (currentCertification.trim() && !formData.certifications.includes(currentCertification.trim())) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, currentCertification.trim()]
      }));
      setCurrentCertification('');
    }
  };

  const removeCertification = (cert: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c !== cert)
    }));
  };

  const addLanguage = () => {
    if (currentLanguage.trim() && !formData.languages.includes(currentLanguage.trim())) {
      setFormData(prev => ({
        ...prev,
        languages: [...prev.languages, currentLanguage.trim()]
      }));
      setCurrentLanguage('');
    }
  };

  const removeLanguage = (lang: string) => {
    if (lang !== 'English') { // Don't allow removing English
      setFormData(prev => ({
        ...prev,
        languages: prev.languages.filter(l => l !== lang)
      }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-blue-600" />
              <span>Apply for Expert Verification</span>
            </CardTitle>
            <CardDescription>
              Join our verified expert network to provide authoritative legal answers
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Important Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 mb-1">Expert Verification Process</p>
                  <p className="text-blue-700">
                    We verify all expert applications to ensure quality and credibility. 
                    Your credentials will be reviewed by our legal team within 5-7 business days.
                  </p>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Professional Information</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bar_number">Bar Number (Optional)</Label>
                  <Input
                    id="bar_number"
                    value={formData.bar_number}
                    onChange={(e) => handleInputChange('bar_number', e.target.value)}
                    placeholder="e.g., S1234567A"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="years_experience">Years of Experience</Label>
                  <Input
                    id="years_experience"
                    type="number"
                    min="0"
                    max="50"
                    value={formData.years_experience}
                    onChange={(e) => handleInputChange('years_experience', e.target.value)}
                    placeholder="e.g., 5"
                  />
                </div>
              </div>
            </div>

            {/* Specializations */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Legal Specializations *</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.specializations.map((spec) => (
                  <Badge key={spec} variant="secondary" className="flex items-center space-x-1">
                    <span>{spec}</span>
                    <button
                      type="button"
                      onClick={() => removeSpecialization(spec)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex space-x-2">
                <Input
                  value={currentSpecialization}
                  onChange={(e) => setCurrentSpecialization(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, addSpecialization)}
                  placeholder="e.g., Employment Law, Corporate Law..."
                />
                <Button type="button" onClick={addSpecialization} variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Education */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <GraduationCap className="h-5 w-5" />
                <span>Education</span>
              </h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.education.map((edu) => (
                  <Badge key={edu} variant="outline" className="flex items-center space-x-1">
                    <span>{edu}</span>
                    <button
                      type="button"
                      onClick={() => removeEducation(edu)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex space-x-2">
                <Input
                  value={currentEducation}
                  onChange={(e) => setCurrentEducation(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, addEducation)}
                  placeholder="e.g., LLB from NUS, JD from Harvard..."
                />
                <Button type="button" onClick={addEducation} variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Certifications */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Certifications</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.certifications.map((cert) => (
                  <Badge key={cert} variant="outline" className="flex items-center space-x-1">
                    <span>{cert}</span>
                    <button
                      type="button"
                      onClick={() => removeCertification(cert)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex space-x-2">
                <Input
                  value={currentCertification}
                  onChange={(e) => setCurrentCertification(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, addCertification)}
                  placeholder="e.g., Certified Arbitrator, Notary Public..."
                />
                <Button type="button" onClick={addCertification} variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Languages */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Languages</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.languages.map((lang) => (
                  <Badge key={lang} variant="secondary" className="flex items-center space-x-1">
                    <span>{lang}</span>
                    {lang !== 'English' && (
                      <button
                        type="button"
                        onClick={() => removeLanguage(lang)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              <div className="flex space-x-2">
                <Input
                  value={currentLanguage}
                  onChange={(e) => setCurrentLanguage(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, addLanguage)}
                  placeholder="e.g., Mandarin, Malay, Tamil..."
                />
                <Button type="button" onClick={addLanguage} variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Professional Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Brief description of your legal experience and expertise..."
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-gray-500">
                {formData.bio.length}/1000 characters
              </p>
            </div>

            {/* Verification Documents */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Verification Documents</span>
              </h3>
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">Upload verification documents</p>
                <p className="text-sm text-gray-500">
                  Bar admission certificate, law degree, professional licenses, etc.
                </p>
                <Button type="button" variant="outline" className="mt-4">
                  Choose Files
                </Button>
              </div>
            </div>

            {/* Consent Checkboxes */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Consent & Agreements</h3>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="consent_verification"
                  checked={formData.consent_verification}
                  onCheckedChange={(checked) => handleInputChange('consent_verification', checked)}
                />
                <label htmlFor="consent_verification" className="text-sm text-gray-700">
                  I consent to the verification of my credentials and professional background *
                </label>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="consent_public_profile"
                  checked={formData.consent_public_profile}
                  onCheckedChange={(checked) => handleInputChange('consent_public_profile', checked)}
                />
                <label htmlFor="consent_public_profile" className="text-sm text-gray-700">
                  I consent to having my verified expert profile displayed publicly *
                </label>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="consent_answer_questions"
                  checked={formData.consent_answer_questions}
                  onCheckedChange={(checked) => handleInputChange('consent_answer_questions', checked)}
                />
                <label htmlFor="consent_answer_questions" className="text-sm text-gray-700">
                  I agree to provide quality answers and maintain professional standards
                </label>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 mb-1">Important Notice</p>
                  <p className="text-yellow-700">
                    Expert verification is subject to review and approval. False information may result in 
                    rejection or removal from the expert network. All expert answers are subject to our 
                    community guidelines and professional standards.
                  </p>
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
                disabled={loading || !formData.consent_verification || !formData.consent_public_profile || formData.specializations.length === 0}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Award className="h-4 w-4 mr-2" />
                    Submit Application
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
