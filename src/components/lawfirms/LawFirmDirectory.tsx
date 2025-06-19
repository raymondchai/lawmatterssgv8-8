import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Star, 
  Filter,
  Grid,
  List,
  Verified,
  Users
} from 'lucide-react';
import { lawFirmsApi, type LawFirmFilters } from '@/lib/api/lawFirms';
import type { LawFirm } from '@/types';
import { toast } from '@/components/ui/sonner';

interface LawFirmDirectoryProps {
  onFirmSelect?: (firm: LawFirm) => void;
  className?: string;
}

const PRACTICE_AREAS = [
  'Corporate Law',
  'Employment Law',
  'Intellectual Property',
  'Real Estate',
  'Family Law',
  'Criminal Law',
  'Immigration Law',
  'Tax Law',
  'Banking & Finance',
  'Litigation',
  'Mergers & Acquisitions',
  'Compliance & Regulatory'
];

export const LawFirmDirectory: React.FC<LawFirmDirectoryProps> = ({
  onFirmSelect,
  className = ''
}) => {
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([]);
  const [filteredFirms, setFilteredFirms] = useState<LawFirm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPracticeAreas, setSelectedPracticeAreas] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'rating' | 'name' | 'newest'>('rating');

  useEffect(() => {
    loadLawFirms();
  }, []);

  useEffect(() => {
    filterAndSortFirms();
  }, [lawFirms, searchQuery, selectedPracticeAreas, minRating, verifiedOnly, sortBy]);

  const loadLawFirms = async () => {
    try {
      setLoading(true);
      const firms = await lawFirmsApi.getLawFirms();
      setLawFirms(firms);
    } catch (error: any) {
      console.error('Error loading law firms:', error);
      toast.error('Failed to load law firms');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortFirms = () => {
    let filtered = [...lawFirms];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(firm =>
        firm.name.toLowerCase().includes(query) ||
        firm.description.toLowerCase().includes(query) ||
        firm.practice_areas.some(area => area.toLowerCase().includes(query))
      );
    }

    // Apply practice area filter
    if (selectedPracticeAreas.length > 0) {
      filtered = filtered.filter(firm =>
        selectedPracticeAreas.some(area => firm.practice_areas.includes(area))
      );
    }

    // Apply rating filter
    if (minRating > 0) {
      filtered = filtered.filter(firm => firm.rating >= minRating);
    }

    // Apply verified filter
    if (verifiedOnly) {
      filtered = filtered.filter(firm => firm.verified);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    setFilteredFirms(filtered);
  };

  const handlePracticeAreaToggle = (area: string) => {
    setSelectedPracticeAreas(prev =>
      prev.includes(area)
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedPracticeAreas([]);
    setMinRating(0);
    setVerifiedOnly(false);
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

  const LawFirmCard: React.FC<{ firm: LawFirm }> = ({ firm }) => (
    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onFirmSelect?.(firm)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate flex items-center space-x-2">
              <span>{firm.name}</span>
              {firm.verified && (
                <Verified className="h-4 w-4 text-blue-500" />
              )}
            </CardTitle>
            <div className="flex items-center space-x-1 mt-1">
              {renderStars(firm.rating)}
              <span className="text-sm text-gray-600 ml-2">
                {firm.rating.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <CardDescription className="line-clamp-2">
          {firm.description}
        </CardDescription>

        {/* Contact Info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{firm.address}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Phone className="h-4 w-4 flex-shrink-0" />
            <span>{firm.phone}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{firm.email}</span>
          </div>
          {firm.website && (
            <div className="flex items-center space-x-2 text-gray-600">
              <Globe className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{firm.website}</span>
            </div>
          )}
        </div>

        {/* Practice Areas */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Practice Areas:</p>
          <div className="flex flex-wrap gap-1">
            {firm.practice_areas.slice(0, 3).map((area, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {area}
              </Badge>
            ))}
            {firm.practice_areas.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{firm.practice_areas.length - 3} more
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const LawFirmListItem: React.FC<{ firm: LawFirm }> = ({ firm }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onFirmSelect?.(firm)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-medium truncate">{firm.name}</h3>
                  {firm.verified && (
                    <Verified className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{firm.description}</p>
                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                  <span>{firm.address}</span>
                  <span>{firm.phone}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              {renderStars(firm.rating)}
              <span className="text-sm text-gray-600 ml-1">
                {firm.rating.toFixed(1)}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {firm.practice_areas.slice(0, 2).map((area, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Law Firm Directory</h2>
          <p className="text-gray-600">
            Find and connect with verified legal professionals in Singapore
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search and Sort */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search law firms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Practice Areas */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Practice Areas
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {PRACTICE_AREAS.map((area) => (
                    <div key={area} className="flex items-center space-x-2">
                      <Checkbox
                        id={area}
                        checked={selectedPracticeAreas.includes(area)}
                        onCheckedChange={() => handlePracticeAreaToggle(area)}
                      />
                      <label htmlFor={area} className="text-sm text-gray-600">
                        {area}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Minimum Rating
                </label>
                <Select value={minRating.toString()} onValueChange={(value) => setMinRating(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any rating</SelectItem>
                    <SelectItem value="3">3+ stars</SelectItem>
                    <SelectItem value="4">4+ stars</SelectItem>
                    <SelectItem value="4.5">4.5+ stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Other Filters */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Other Filters
                </label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="verified"
                      checked={verifiedOnly}
                      onCheckedChange={setVerifiedOnly}
                    />
                    <label htmlFor="verified" className="text-sm text-gray-600">
                      Verified firms only
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Clear Filters */}
            {(searchQuery || selectedPracticeAreas.length > 0 || minRating > 0 || verifiedOnly) && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            {loading ? 'Loading...' : `${filteredFirms.length} law firm${filteredFirms.length === 1 ? '' : 's'} found`}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredFirms.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFirms.map((firm) => (
                <LawFirmCard key={firm.id} firm={firm} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFirms.map((firm) => (
                <LawFirmListItem key={firm.id} firm={firm} />
              ))}
            </div>
          )
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No law firms found</h3>
              <p className="text-gray-500">
                Try adjusting your search criteria or browse different practice areas.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
