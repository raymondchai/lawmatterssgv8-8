import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Star, 
  Phone, 
  Mail, 
  Navigation,
  Maximize2,
  Minimize2,
  Users,
  Clock
} from 'lucide-react';

interface LawFirm {
  id: number;
  name: string;
  description: string;
  specialties: string[];
  location: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  rating: number;
  reviews: number;
  phone: string;
  email: string;
  lawyers: number;
  established: string;
}

interface LawFirmMapProps {
  lawFirms: LawFirm[];
  selectedFirm?: LawFirm | null;
  onFirmSelect: (firm: LawFirm) => void;
  className?: string;
}

const LawFirmMap: React.FC<LawFirmMapProps> = ({
  lawFirms,
  selectedFirm,
  onFirmSelect,
  className = ""
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 1.3521, lng: 103.8198 }); // Singapore center
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setMapCenter({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.log('Location access denied or unavailable:', error);
          // Keep default Singapore center
        }
      );
    }
  }, []);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get distance to user's location
  const getDistanceToUser = (firm: LawFirm): string => {
    if (!userLocation) return '';
    const distance = calculateDistance(
      userLocation.lat, 
      userLocation.lng, 
      firm.coordinates.lat, 
      firm.coordinates.lng
    );
    return `${distance.toFixed(1)} km away`;
  };

  // Generate Google Maps embed URL
  const getMapEmbedUrl = () => {
    const markers = lawFirms.map(firm => 
      `markers=color:red%7Clabel:${firm.id}%7C${firm.coordinates.lat},${firm.coordinates.lng}`
    ).join('&');
    
    const center = selectedFirm 
      ? `${selectedFirm.coordinates.lat},${selectedFirm.coordinates.lng}`
      : `${mapCenter.lat},${mapCenter.lng}`;
    
    return `https://www.google.com/maps/embed/v1/view?key=YOUR_GOOGLE_MAPS_API_KEY&center=${center}&zoom=12&${markers}`;
  };

  // Alternative: Use OpenStreetMap with Leaflet-style display
  const renderStaticMap = () => {
    return (
      <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
        {/* Map placeholder with firm locations */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Interactive Map</h3>
              <p className="text-gray-500 text-sm">
                {lawFirms.length} law firms in Singapore
              </p>
            </div>
          </div>
          
          {/* Firm markers */}
          {lawFirms.map((firm, index) => (
            <div
              key={firm.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 ${
                selectedFirm?.id === firm.id 
                  ? 'scale-125 z-20' 
                  : 'hover:scale-110 z-10'
              }`}
              style={{
                left: `${20 + (index * 15) % 60}%`,
                top: `${30 + (index * 10) % 40}%`
              }}
              onClick={() => onFirmSelect(firm)}
            >
              <div className={`relative ${
                selectedFirm?.id === firm.id 
                  ? 'text-red-600' 
                  : 'text-blue-600 hover:text-red-600'
              }`}>
                <MapPin className="h-8 w-8 fill-current" />
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 bg-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-current">
                  {firm.id}
                </div>
              </div>
            </div>
          ))}
          
          {/* User location marker */}
          {userLocation && (
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30"
              style={{
                left: '50%',
                top: '50%'
              }}
            >
              <div className="relative">
                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
                <div className="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-75"></div>
              </div>
            </div>
          )}
        </div>
        
        {/* Map controls */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-white/90 backdrop-blur-sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          {userLocation && (
            <Button
              size="sm"
              variant="outline"
              className="bg-white/90 backdrop-blur-sm"
              onClick={() => setMapCenter(userLocation)}
            >
              <Navigation className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      <Card className={`h-full ${isFullscreen ? 'rounded-none border-0' : ''}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Law Firms Near You
            </CardTitle>
            <div className="flex items-center space-x-2">
              {userLocation && (
                <Badge variant="outline" className="text-xs">
                  <Navigation className="h-3 w-3 mr-1" />
                  Location enabled
                </Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 flex-1">
          <div className={`${isFullscreen ? 'h-screen' : 'h-96'} relative`}>
            {renderStaticMap()}
          </div>
          
          {/* Selected firm info */}
          {selectedFirm && (
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{selectedFirm.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{selectedFirm.description}</p>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">{selectedFirm.rating}</span>
                  <span className="text-xs text-gray-500">({selectedFirm.reviews})</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedFirm.specialties.slice(0, 3).map((specialty) => (
                  <Badge key={specialty} variant="secondary" className="text-xs">
                    {specialty}
                  </Badge>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>{selectedFirm.location}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>{selectedFirm.lawyers} Lawyers</span>
                </div>
                {userLocation && (
                  <div className="flex items-center space-x-2">
                    <Navigation className="h-4 w-4" />
                    <span>{getDistanceToUser(selectedFirm)}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Est. {selectedFirm.established}</span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  View Profile
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  Get Directions
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LawFirmMap;
