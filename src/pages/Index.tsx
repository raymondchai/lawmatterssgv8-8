
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

const Index = () => {
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
      <AuthDebug />
    </div>
  );
};

export default Index;
