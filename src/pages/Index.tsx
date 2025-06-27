
import { Navigation } from "@/components/layout/Navigation";
import { Hero } from "@/components/sections/Hero";
import { FreeAnalysisPromo } from "@/components/sections/FreeAnalysisPromo";
import { PlatformFeatures } from "@/components/sections/PracticeAreas";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { AboutSection } from "@/components/sections/AboutSection";
import { Testimonials } from "@/components/sections/Testimonials";
import { ContactSection } from "@/components/sections/ContactSection";
import { Footer } from "@/components/layout/Footer";
import { AuthDebug } from "@/components/debug/AuthDebug";
import { useSafeAuth } from "@/contexts/AuthContext";
import AuthErrorBoundary from "@/components/auth/AuthErrorBoundary";

const Index = () => {
  const { user, loading } = useSafeAuth();

  // Debug log to console
  console.log('Index page - Auth state:', { user: user?.email || 'No user', loading });

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <FreeAnalysisPromo />
      <PlatformFeatures />
      <HowItWorks />
      <AboutSection />
      <Testimonials />
      <ContactSection />
      <Footer />
      <AuthErrorBoundary>
        <AuthDebug />
      </AuthErrorBoundary>
    </div>
  );
};

export default Index;
