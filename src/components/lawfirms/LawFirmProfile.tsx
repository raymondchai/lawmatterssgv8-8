import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  Calendar,
  Clock,
  Users,
  Award,
  GraduationCap,
  Languages,
  DollarSign,
  Verified,
  ArrowLeft,
  MessageSquare,
  Heart,
  Share2,
  ThumbsUp,
  ExternalLink
} from 'lucide-react';
import { lawFirmsApi } from '@/lib/api/lawFirms';
import type { LawFirm, LawFirmTeamMember, LawFirmGalleryImage, LawFirmReview } from '@/types';
import { toast } from '@/components/ui/sonner';
import { formatDistanceToNow } from 'date-fns';
import { LawFirmReviews } from './LawFirmReviews';
import { LawFirmBookingForm } from './LawFirmBookingForm';
import { LawFirmGallery } from './LawFirmGallery';
import { LawFirmContactForm } from './LawFirmContactForm';

interface LawFirmProfileProps {
  firmId?: string;
  onBack?: () => void;
  className?: string;
}

export const LawFirmProfile: React.FC<LawFirmProfileProps> = ({
  firmId,
  onBack,
  className = ''
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const profileId = firmId || id;

  const [firm, setFirm] = useState<LawFirm | null>(null);
  const [teamMembers, setTeamMembers] = useState<LawFirmTeamMember[]>([]);
  const [gallery, setGallery] = useState<LawFirmGalleryImage[]>([]);
  const [reviews, setReviews] = useState<LawFirmReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (profileId) {
      loadLawFirmProfile();
    }
  }, [profileId]);

  const loadLawFirmProfile = async () => {
    if (!profileId) return;

    try {
      setLoading(true);
      const profileData = await lawFirmsApi.getLawFirmProfile(profileId);
      setFirm(profileData);
      setTeamMembers(profileData.team_members || []);
      setGallery(profileData.gallery || []);
      setReviews(profileData.recent_reviews || []);
    } catch (error: any) {
      console.error('Error loading law firm profile:', error);
      toast.error('Failed to load law firm profile');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    return distribution;
  };

  const formatOfficeHours = (hours: any) => {
    if (!hours) return 'Hours not specified';

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return days.map((day, index) => (
      hours[day] ? `${dayNames[index]}: ${hours[day]}` : null
    )).filter(Boolean).join(', ') || 'Hours not specified';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading law firm profile...</p>
        </div>
      </div>
    );
  }

  if (!firm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Law Firm Not Found</h2>
          <p className="text-gray-600 mb-4">The law firm you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/law-firms')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Directory
          </Button>
        </div>
      </div>
    );
  }

  const ratingDistribution = getRatingDistribution();
  const totalReviews = reviews.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with cover image */}
      <div className="relative h-64 bg-gradient-to-r from-blue-600 to-blue-800">
        {firm.cover_image_url && (
          <img
            src={firm.cover_image_url}
            alt={`${firm.name} cover`}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-40" />

        {/* Navigation */}
        <div className="absolute top-4 left-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onBack ? onBack() : navigate('/law-firms')}
            className="bg-white/90 hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Directory
          </Button>
        </div>

        {/* Actions */}
        <div className="absolute top-4 right-4 flex space-x-2">
          <Button variant="secondary" size="sm" className="bg-white/90 hover:bg-white">
            <Heart className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" className="bg-white/90 hover:bg-white">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Firm info header */}
      <div className="relative -mt-16 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card className="bg-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
              {/* Logo */}
              <div className="flex-shrink-0 mb-4 md:mb-0">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                  <AvatarImage src={firm.logo_url} alt={firm.name} />
                  <AvatarFallback className="text-2xl font-bold bg-blue-600 text-white">
                    {firm.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Basic info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{firm.name}</h1>
                  {firm.verified && (
                    <Verified className="h-6 w-6 text-blue-500" />
                  )}
                </div>

                <div className="flex items-center space-x-1 mb-3">
                  {renderStars(firm.rating)}
                  <span className="text-lg font-semibold text-gray-900 ml-2">
                    {firm.rating.toFixed(1)}
                  </span>
                  <span className="text-gray-600">
                    ({firm.total_reviews || 0} reviews)
                  </span>
                </div>

                <p className="text-gray-600 mb-4">{firm.description}</p>

                {/* Quick info */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{firm.address}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{firm.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{firm.email}</span>
                  </div>
                  {firm.website && (
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <a
                        href={firm.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Website
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col space-y-2 mt-4 md:mt-0">
                <Button
                  onClick={() => setShowBookingForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Consultation
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowContactForm(true)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main content */}
              <div className="lg:col-span-2 space-y-6">
                {/* About */}
                <Card>
                  <CardHeader>
                    <CardTitle>About {firm.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed mb-4">{firm.description}</p>

                    {/* Enhanced details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {firm.established_year && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Established: {firm.established_year}
                          </span>
                        </div>
                      )}
                      {firm.firm_size && (
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Firm Size: {firm.firm_size.charAt(0).toUpperCase() + firm.firm_size.slice(1)}
                          </span>
                        </div>
                      )}
                      {firm.response_time && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Response Time: {firm.response_time}
                          </span>
                        </div>
                      )}
                      {firm.consultation_fee && (
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Consultation Fee: ${firm.consultation_fee}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Practice Areas */}
                <Card>
                  <CardHeader>
                    <CardTitle>Practice Areas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {firm.practice_areas.map((area) => (
                        <Badge key={area} variant="secondary" className="text-sm">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Languages & Certifications */}
                {(firm.languages?.length || firm.certifications?.length) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Languages & Certifications</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {firm.languages?.length && (
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <Languages className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900">Languages</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {firm.languages.map((language) => (
                              <Badge key={language} variant="outline" className="text-sm">
                                {language}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {firm.certifications?.length && (
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <Award className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900">Certifications</span>
                          </div>
                          <div className="space-y-1">
                            {firm.certifications.map((cert) => (
                              <div key={cert} className="text-sm text-gray-600">• {cert}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Office Hours */}
                {firm.office_hours && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Office Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700">{formatOfficeHours(firm.office_hours)}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Rating</span>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="font-medium">{firm.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Reviews</span>
                      <span className="font-medium">{totalReviews}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Practice Areas</span>
                      <span className="font-medium">{firm.practice_areas.length}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Verified</span>
                      <div className="flex items-center space-x-1">
                        {firm.verified ? (
                          <>
                            <Verified className="h-4 w-4 text-blue-500" />
                            <span className="text-blue-600 font-medium">Yes</span>
                          </>
                        ) : (
                          <span className="text-gray-500">No</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Write a Review
                    </Button>

                    <Button variant="outline" className="w-full">
                      <Phone className="h-4 w-4 mr-2" />
                      Call Now
                    </Button>

                    <Button variant="outline" className="w-full">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            {teamMembers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamMembers.map((member) => (
                  <Card key={member.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <Avatar className="h-20 w-20 mx-auto mb-4">
                          <AvatarImage src={member.photo_url} alt={member.name} />
                          <AvatarFallback className="text-lg bg-blue-100 text-blue-600">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>

                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{member.name}</h3>
                        <p className="text-blue-600 font-medium mb-3">{member.title}</p>

                        {member.bio && (
                          <p className="text-gray-600 text-sm mb-4">{member.bio}</p>
                        )}

                        {/* Practice Areas */}
                        {member.practice_areas.length > 0 && (
                          <div className="mb-4">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {member.practice_areas.slice(0, 3).map((area) => (
                                <Badge key={area} variant="secondary" className="text-xs">
                                  {area}
                                </Badge>
                              ))}
                              {member.practice_areas.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{member.practice_areas.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Experience & Education */}
                        <div className="space-y-2 text-sm text-gray-600">
                          {member.years_experience && (
                            <div className="flex items-center justify-center space-x-1">
                              <GraduationCap className="h-4 w-4" />
                              <span>{member.years_experience} years experience</span>
                            </div>
                          )}

                          {member.languages && member.languages.length > 0 && (
                            <div className="flex items-center justify-center space-x-1">
                              <Languages className="h-4 w-4" />
                              <span>{member.languages.join(', ')}</span>
                            </div>
                          )}
                        </div>

                        {/* Contact */}
                        <div className="mt-4 space-y-2">
                          {member.email && (
                            <Button variant="outline" size="sm" className="w-full">
                              <Mail className="h-4 w-4 mr-2" />
                              Contact
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No team information available</h3>
                  <p className="text-gray-500">
                    Team member information has not been provided yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="gallery" className="mt-6">
            <LawFirmGallery images={gallery} />
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <LawFirmReviews lawFirmId={firm.id} reviews={reviews} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking form modal */}
      {showBookingForm && (
        <LawFirmBookingForm
          lawFirm={firm}
          teamMembers={teamMembers}
          onClose={() => setShowBookingForm(false)}
          onBookingCreated={() => {
            setShowBookingForm(false);
            toast.success('Booking request submitted successfully!');
          }}
        />
      )}

      {/* Contact form modal */}
      {showContactForm && (
        <LawFirmContactForm
          lawFirm={firm}
          onClose={() => setShowContactForm(false)}
          onMessageSent={() => {
            setShowContactForm(false);
            toast.success('Message sent successfully!');
          }}
        />
      )}
    </div>
  );
};
