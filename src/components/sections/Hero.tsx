
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, MessageSquare, Building2, Zap } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/lib/config/constants";

export const Hero = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/legal-qa?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <section id="home" className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 pt-16">
      <div className="absolute inset-0 bg-black opacity-10"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              AI-Powered Legal Solutions for{" "}
              <span className="text-yellow-300 block">Singapore</span>
            </h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Find the right law firm, get instant legal answers, and access legal document analysis - all in one place.
            </p>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="I need help understanding Singapore's Employment Act..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 py-3 text-gray-900 bg-white border-0 focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <Button
                size="lg"
                onClick={handleSearch}
                className="bg-yellow-500 hover:bg-yellow-600 text-blue-900 font-semibold px-8"
              >
                Search
              </Button>
            </div>

            {/* Popular Searches */}
            <div className="mb-8">
              <p className="text-sm text-blue-200 mb-2">Popular:</p>
              <div className="flex flex-wrap gap-2">
                {["Tenant Rights", "Company Incorporation", "Employment Act", "Divorce Proceedings"].map((term) => (
                  <button
                    key={term}
                    onClick={() => setSearchQuery(term)}
                    className="px-3 py-1 bg-blue-700 hover:bg-blue-600 rounded-full text-sm text-blue-100 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button
                size="lg"
                onClick={() => navigate(ROUTES.publicAnalysis)}
                className="bg-yellow-500 hover:bg-yellow-600 text-blue-900 font-semibold"
              >
                <Zap className="mr-2 h-5 w-5" />
                Free Document Analysis
              </Button>
              <Button
                size="lg"
                onClick={() => navigate('/legal-qa')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Ask Legal Question
                <MessageSquare className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/law-firms')}
                className="border-white text-white hover:bg-white hover:text-blue-900"
              >
                Find Law Firms
                <Building2 className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Platform Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-blue-700">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Building2 className="h-8 w-8 text-yellow-300" />
                </div>
                <div className="text-2xl font-bold">500+</div>
                <div className="text-sm text-blue-200">Legal Professionals</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <FileText className="h-8 w-8 text-yellow-300" />
                </div>
                <div className="text-2xl font-bold">10,000+</div>
                <div className="text-sm text-blue-200">Documents Simplified</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <MessageSquare className="h-8 w-8 text-yellow-300" />
                </div>
                <div className="text-2xl font-bold">15,000+</div>
                <div className="text-sm text-blue-200">Questions Answered</div>
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="relative">
              <div className="bg-white rounded-lg shadow-2xl p-8 transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">How can I help you today?</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">I need help understanding Singapore's Employment Act...</p>
                    <div className="flex items-center text-xs text-gray-500">
                      <Search className="h-3 w-3 mr-1" />
                      <span>Popular: Tenant Rights • Company Incorporation</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-3">The Employment Act is Singapore's main labor law that provides basic terms and working conditions for employees. The Act was last amended in April 2019 to extend coverage to all employees regardless of salary level, with exceptions for public servants, domestic workers, and seafarers. Key provisions include...</p>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                      Try the AI Legal Assistant →
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
