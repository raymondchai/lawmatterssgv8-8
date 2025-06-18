
import { Button } from "@/components/ui/button";
import { CheckCircle, Award, Users, Clock } from "lucide-react";

export const AboutSection = () => {
  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Trusted Legal Partners Since 1998
            </h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              LawMatters has been Singapore's premier legal firm for over two decades. 
              We've built our reputation on delivering exceptional legal services with 
              integrity, expertise, and unwavering commitment to our clients' success.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Client-Focused Approach</h3>
                  <p className="text-gray-600">We prioritize understanding your unique needs and objectives.</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Proven Track Record</h3>
                  <p className="text-gray-600">Over 500 successful cases with a 95% client satisfaction rate.</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Expert Legal Team</h3>
                  <p className="text-gray-600">Qualified lawyers with specialized expertise across multiple practice areas.</p>
                </div>
              </div>
            </div>

            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Meet Our Team
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg text-center">
              <Award className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">25+</h3>
              <p className="text-gray-600">Years of Excellence</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg text-center">
              <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">1000+</h3>
              <p className="text-gray-600">Satisfied Clients</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg text-center">
              <CheckCircle className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">500+</h3>
              <p className="text-gray-600">Cases Won</p>
            </div>
            <div className="bg-orange-50 p-6 rounded-lg text-center">
              <Clock className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">24/7</h3>
              <p className="text-gray-600">Client Support</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
