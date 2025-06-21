import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, X } from 'lucide-react';
import { lawFirmsApi } from '@/lib/api/lawFirms';
import type { LawFirm, LawFirmTeamMember } from '@/types';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';

interface LawFirmBookingFormProps {
  lawFirm: LawFirm;
  teamMembers: LawFirmTeamMember[];
  onClose: () => void;
  onBookingCreated: () => void;
}

export const LawFirmBookingForm: React.FC<LawFirmBookingFormProps> = ({
  lawFirm,
  teamMembers,
  onClose,
  onBookingCreated
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    consultation_type: 'initial' as const,
    team_member_id: '',
    preferred_date: '',
    preferred_time: '',
    duration_minutes: 60,
    message: '',
    contact_phone: '',
    alternative_dates: ['', ''],
    special_requirements: '',
    meeting_type: 'in_person' as const
  });

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please log in to book a consultation');
      return;
    }

    try {
      setLoading(true);
      
      await lawFirmsApi.createBooking({
        law_firm_id: lawFirm.id,
        user_id: user.id,
        team_member_id: formData.team_member_id || undefined,
        consultation_type: formData.consultation_type,
        preferred_date: formData.preferred_date,
        preferred_time: formData.preferred_time,
        duration_minutes: formData.duration_minutes,
        message: formData.message || undefined,
        contact_phone: formData.contact_phone || undefined,
        status: 'pending'
      });

      onBookingCreated();
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Book Consultation</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Law Firm Info */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="font-medium text-gray-900">{lawFirm.name}</h3>
              <p className="text-sm text-gray-600">{lawFirm.address}</p>
            </div>

            {/* Consultation Type */}
            <div className="space-y-2">
              <Label htmlFor="consultation_type">Consultation Type</Label>
              <Select
                value={formData.consultation_type}
                onValueChange={(value) => handleInputChange('consultation_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial">Initial Consultation</SelectItem>
                  <SelectItem value="follow_up">Follow-up Meeting</SelectItem>
                  <SelectItem value="document_review">Document Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Team Member */}
            {teamMembers.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="team_member">Preferred Lawyer (Optional)</Label>
                <Select
                  value={formData.team_member_id}
                  onValueChange={(value) => handleInputChange('team_member_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any available lawyer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any available lawyer</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} - {member.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preferred_date">Preferred Date</Label>
                <Input
                  id="preferred_date"
                  type="date"
                  value={formData.preferred_date}
                  onChange={(e) => handleInputChange('preferred_date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="preferred_time">Preferred Time</Label>
                <Input
                  id="preferred_time"
                  type="time"
                  value={formData.preferred_time}
                  onChange={(e) => handleInputChange('preferred_time', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select
                value={formData.duration_minutes.toString()}
                onValueChange={(value) => handleInputChange('duration_minutes', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contact Phone */}
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone (Optional)</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                placeholder="Your phone number"
              />
            </div>

            {/* Meeting Type */}
            <div className="space-y-2">
              <Label htmlFor="meeting_type">Meeting Type</Label>
              <Select
                value={formData.meeting_type}
                onValueChange={(value) => handleInputChange('meeting_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In-Person Meeting</SelectItem>
                  <SelectItem value="video_call">Video Call</SelectItem>
                  <SelectItem value="phone_call">Phone Call</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Alternative Dates */}
            <div className="space-y-2">
              <Label>Alternative Dates (Optional)</Label>
              <p className="text-sm text-gray-600 mb-2">
                Provide alternative dates in case your preferred time is not available
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={formData.alternative_dates[0]}
                  onChange={(e) => {
                    const newDates = [...formData.alternative_dates];
                    newDates[0] = e.target.value;
                    handleInputChange('alternative_dates', newDates);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                />
                <Input
                  type="date"
                  value={formData.alternative_dates[1]}
                  onChange={(e) => {
                    const newDates = [...formData.alternative_dates];
                    newDates[1] = e.target.value;
                    handleInputChange('alternative_dates', newDates);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                placeholder="Brief description of your legal matter..."
                rows={3}
              />
            </div>

            {/* Special Requirements */}
            <div className="space-y-2">
              <Label htmlFor="special_requirements">Special Requirements (Optional)</Label>
              <Textarea
                id="special_requirements"
                value={formData.special_requirements}
                onChange={(e) => handleInputChange('special_requirements', e.target.value)}
                placeholder="Any accessibility needs, language preferences, or other special requirements..."
                rows={2}
              />
            </div>

            {/* Fee Information */}
            {lawFirm.consultation_fee && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Consultation Fee:</strong> ${lawFirm.consultation_fee}
                </p>
              </div>
            )}

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
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Booking...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Consultation
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
