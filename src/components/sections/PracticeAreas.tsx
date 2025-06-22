
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, FileText, MessageSquare, Download, Search, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

const platformFeatures = [
  {
    icon: Building2,
    title: "Law Firm Directory",
    description: "Find the perfect law firm with our comprehensive directory. Filter by practice area, location, and ratings.",
    features: ["Advanced Search Filters", "Verified Reviews & Ratings", "Direct Contact Information", "Specialization Matching"],
    action: "Browse Directory",
    link: "/law-firms"
  },
  {
    icon: FileText,
    title: "Legal Document Analysis",
    description: "Upload your documents for instant AI-powered analysis, summary, and interpretation.",
    features: ["AI Document Summary", "Legal Risk Assessment", "Key Terms Extraction", "Compliance Checking"],
    action: "Analyze Documents",
    link: "/dashboard/documents"
  },
  {
    icon: MessageSquare,
    title: "Legal Q&A",
    description: "Get instant answers to your legal questions from our AI assistant trained on Singapore law.",
    features: ["24/7 AI Legal Assistant", "Singapore Law Expertise", "Case Law References", "Personalized Advice"],
    action: "Ask a Question",
    link: "/dashboard/ai-assistant"
  },
  {
    icon: Download,
    title: "Document Templates",
    description: "Access a library of legal document templates specific to Singapore's legal system.",
    features: ["Singapore-Specific Templates", "Customizable Forms", "Legal Compliance Validation", "Instant Download"],
    action: "Browse Templates",
    link: "/dashboard/templates"
  },
  {
    icon: Search,
    title: "Case Summaries",
    description: "Explore our database of court case summaries, without lengthy and easy to understand.",
    features: ["Simplified Case Summaries", "Search by Legal Topic", "Recent Court Decisions", "Legal Precedents"],
    action: "Explore Cases",
    link: "/case-summaries"
  },
  {
    icon: BookOpen,
    title: "Singapore-Specific Resources",
    description: "All resources are tailored specifically to Singapore's legal system and requirements.",
    features: ["Local Legal Updates", "Regulatory Changes", "Government Resources", "Legal Glossary"],
    action: "Learn More",
    link: "/resources"
  }
];

export const PlatformFeatures = () => {
  const navigate = useNavigate();

  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Everything You Need In One Place
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            LegalHelpSG combines AI technology with comprehensive legal resources to give you
            the most efficient legal help experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {platformFeatures.map((feature) => (
            <Card key={feature.title} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardHeader>
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4 group-hover:bg-blue-600 transition-colors">
                  <feature.icon className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {feature.features.map((item) => (
                    <li key={item} className="flex items-center text-sm text-gray-700">
                      <div className="h-1.5 w-1.5 bg-blue-600 rounded-full mr-3"></div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="w-full group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors"
                  onClick={() => navigate(feature.link)}
                >
                  {feature.action}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
            Get Started
          </Button>
        </div>
      </div>
    </section>
  );
};
