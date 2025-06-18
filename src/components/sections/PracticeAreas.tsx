
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, Home, Briefcase, Heart, Gavel } from "lucide-react";

const practiceAreas = [
  {
    icon: Building2,
    title: "Corporate Law",
    description: "Complete corporate legal services including mergers, acquisitions, compliance, and governance.",
    features: ["Contract Negotiation", "M&A Advisory", "Regulatory Compliance", "Corporate Governance"]
  },
  {
    icon: Users,
    title: "Employment Law",
    description: "Protecting both employers and employees with comprehensive employment legal solutions.",
    features: ["Employment Contracts", "Dispute Resolution", "HR Compliance", "Workplace Policies"]
  },
  {
    icon: Home,
    title: "Real Estate Law",
    description: "Expert guidance for all your property transactions and real estate legal matters.",
    features: ["Property Transactions", "Lease Agreements", "Property Disputes", "Development Law"]
  },
  {
    icon: Briefcase,
    title: "Commercial Litigation",
    description: "Aggressive representation in complex commercial disputes and litigation matters.",
    features: ["Contract Disputes", "Business Litigation", "Debt Recovery", "Arbitration"]
  },
  {
    icon: Heart,
    title: "Family Law",
    description: "Compassionate legal support for sensitive family matters and personal disputes.",
    features: ["Divorce Proceedings", "Child Custody", "Property Division", "Adoption"]
  },
  {
    icon: Gavel,
    title: "Criminal Defense",
    description: "Strong defense representation for criminal charges and legal proceedings.",
    features: ["Criminal Defense", "White Collar Crimes", "Traffic Offenses", "Appeals"]
  }
];

export const PracticeAreas = () => {
  return (
    <section id="practice-areas" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Our Practice Areas
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We provide comprehensive legal services across multiple practice areas, 
            ensuring expert representation for all your legal needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {practiceAreas.map((area, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardHeader>
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4 group-hover:bg-blue-600 transition-colors">
                  <area.icon className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {area.title}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {area.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {area.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-sm text-gray-700">
                      <div className="h-1.5 w-1.5 bg-blue-600 rounded-full mr-3"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors">
                  Learn More
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
            Schedule a Consultation
          </Button>
        </div>
      </div>
    </section>
  );
};
