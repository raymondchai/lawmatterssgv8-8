import React from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { LawFirmProfile as LawFirmProfileComponent } from '@/components/lawfirms';

const LawFirmProfile = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <LawFirmProfileComponent />
      <Footer />
    </div>
  );
};

export default LawFirmProfile;
