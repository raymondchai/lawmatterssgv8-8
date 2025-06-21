import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Phone, X } from 'lucide-react';
import type { LawFirm } from '@/types';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';

interface LawFirmContactFormProps {
  lawFirm: LawFirm;
  onClose: () => void;
  onMessageSent: () => void;
}

export const LawFirmContactForm: React.FC<LawFirmContactFormProps> = ({
  lawFirm,
  onClose,
  onMessageSent
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    phone: '',
    subject: '',
    message: '',
    inquiry_type: 'general' as const,
    preferred_contact_method: 'email' as const,
    urgent: false,
    consent_to_contact: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.consent_to_contact) {
      toast.error('Please consent to being contacted');
      return;
    }

    try {
      setLoading(true);
      
      // Here you would typically send the contact form data to your backend
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Message sent successfully! The law firm will contact you soon.');
      onMessageSent();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contact {lawFirm.name}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Law Firm Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">{lawFirm.name}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>{lawFirm.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>{lawFirm.email}</span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Your phone number"
              />
            </div>

            {/* Inquiry Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inquiry_type">Type of Inquiry</Label>
                <Select
                  value={formData.inquiry_type}
                  onValueChange={(value) => handleInputChange('inquiry_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Inquiry</SelectItem>
                    <SelectItem value="consultation">Consultation Request</SelectItem>
                    <SelectItem value="case_evaluation">Case Evaluation</SelectItem>
                    <SelectItem value="document_review">Document Review</SelectItem>
                    <SelectItem value="legal_advice">Legal Advice</SelectItem>
                    <SelectItem value="representation">Legal Representation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred_contact">Preferred Contact Method</Label>
                <Select
                  value={formData.preferred_contact_method}
                  onValueChange={(value) => handleInputChange('preferred_contact_method', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="either">Either</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Brief description of your legal matter"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                placeholder="Please provide details about your legal matter, including any relevant dates, parties involved, and specific questions you have..."
                rows={5}
                required
              />
            </div>

            {/* Additional Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="urgent"
                  checked={formData.urgent}
                  onCheckedChange={(checked) => handleInputChange('urgent', checked as boolean)}
                />
                <label htmlFor="urgent" className="text-sm text-gray-700">
                  This is an urgent matter requiring immediate attention
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="consent"
                  checked={formData.consent_to_contact}
                  onCheckedChange={(checked) => handleInputChange('consent_to_contact', checked as boolean)}
                />
                <label htmlFor="consent" className="text-sm text-gray-700">
                  I consent to being contacted by {lawFirm.name} regarding my inquiry *
                </label>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800">
              <p className="font-medium mb-1">Important Notice:</p>
              <p>
                This form is for initial inquiries only. Do not include confidential or sensitive information. 
                An attorney-client relationship is not formed until a formal agreement is signed.
              </p>
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
                disabled={loading || !formData.consent_to_contact}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Message
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
