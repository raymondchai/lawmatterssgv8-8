import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Users, CheckCircle, ArrowRight } from "lucide-react";

const steps = [
  {
    step: "Step 1",
    icon: Search,
    title: "Identify Your Legal Need",
    description: "Browse our legal topics, use our search function, or start with a question to identify your specific legal need.",
    features: [
      "Search by legal topic or question",
      "Browse categories and case types", 
      "Get instant topic suggestions",
      "Access legal glossary"
    ],
    color: "blue"
  },
  {
    step: "Step 2", 
    icon: Users,
    title: "Access Resources or Find Experts",
    description: "Use our AI-powered tools to get information, download templates, or find the right legal professional.",
    features: [
      "AI legal assistant for instant answers",
      "Download customizable legal templates",
      "Find qualified lawyers by specialty",
      "Access case summaries and precedents"
    ],
    color: "green"
  },
  {
    step: "Step 3",
    icon: CheckCircle, 
    title: "Take Informed Action",
    description: "With clear information and the right resources, you can make confident decisions about your legal matters.",
    features: [
      "Make informed legal decisions",
      "Connect with verified professionals",
      "Download completed documents",
      "Track your legal progress"
    ],
    color: "purple"
  }
];

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            LegalLinkSG makes accessing legal information and services easy for everyone
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="text-center">
                  <div className={`flex items-center justify-center w-16 h-16 bg-${step.color}-100 rounded-full mx-auto mb-4`}>
                    <step.icon className={`h-8 w-8 text-${step.color}-600`} />
                  </div>
                  <div className={`text-sm font-semibold text-${step.color}-600 mb-2`}>
                    {step.step}
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    {step.title}
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    {step.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {step.features.map((feature) => (
                      <li key={feature} className="flex items-start text-sm text-gray-700">
                        <div className={`h-1.5 w-1.5 bg-${step.color}-600 rounded-full mt-2 mr-3 flex-shrink-0`}></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              
              {/* Arrow between steps */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <ArrowRight className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to get started?
          </h3>
          <p className="text-gray-600 mb-8">
            Join thousands of Singaporeans who are already using LegalLinkSG to navigate their legal matters.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Get Started Free
            </Button>
            <Button size="lg" variant="outline">
              Browse Law Firms
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
