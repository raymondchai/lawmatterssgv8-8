import React, { useState } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  MapPin, 
  Star, 
  Phone, 
  Mail, 
  Building2,
  Filter,
  Users,
  Clock
} from 'lucide-react';

const LawFirms = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");

  // Mock data for law firms
  const lawFirms = [
    {
      id: 1,
      name: "Singapore Legal Associates",
      description: "Full-service law firm specializing in corporate and commercial law",
      specialties: ["Corporate Law", "Commercial Litigation", "M&A"],
      location: "Central Business District",
      rating: 4.8,
      reviews: 124,
      phone: "+65 6234 5678",
      email: "contact@sla.com.sg",
      lawyers: 15,
      established: "1995"
    },
    {
      id: 2,
      name: "Family Law Partners",
      description: "Dedicated family law practice with compassionate approach",
      specialties: ["Family Law", "Divorce", "Child Custody"],
      location: "Orchard",
      rating: 4.9,
      reviews: 89,
      phone: "+65 6345 6789",
      email: "info@flp.com.sg",
      lawyers: 8,
      established: "2001"
    },
    {
      id: 3,
      name: "Employment Rights Advocates",
      description: "Protecting employee and employer rights across Singapore",
      specialties: ["Employment Law", "HR Compliance", "Workplace Disputes"],
      location: "Raffles Place",
      rating: 4.7,
      reviews: 156,
      phone: "+65 6456 7890",
      email: "help@era.com.sg",
      lawyers: 12,
      established: "2008"
    }
  ];

  const locations = ["All Locations", "Central Business District", "Orchard", "Raffles Place", "Marina Bay"];
  const specialties = ["All Specialties", "Corporate Law", "Family Law", "Employment Law", "Real Estate Law", "Criminal Defense"];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-blue-900 text-white pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Find Legal Professionals
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Search our directory of qualified Singaporean lawyers and law firms. 
              Filter by practice area, location, and ratings.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Search by firm name, lawyer, or legal topic..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-0 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select 
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
                <select 
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {specialties.map(specialty => (
                    <option key={specialty} value={specialty}>{specialty}</option>
                  ))}
                </select>
                <Button className="bg-blue-600 hover:bg-blue-700 px-8">
                  Search
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {lawFirms.length} Law Firms Found
            </h2>
            <Button variant="outline" className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>More Filters</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {lawFirms.map((firm) => (
              <Card key={firm.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900 mb-2">
                        {firm.name}
                      </CardTitle>
                      <CardDescription className="text-gray-600 mb-4">
                        {firm.description}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="font-semibold">{firm.rating}</span>
                      <span className="text-gray-500">({firm.reviews})</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {firm.specialties.map((specialty) => (
                      <Badge key={specialty} variant="secondary">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{firm.location}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{firm.lawyers} Lawyers</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>Established {firm.established}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                      View Profile
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Contact Firm
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              Load More Results
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LawFirms;
