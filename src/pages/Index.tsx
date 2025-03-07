
import React from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import AQSummary from '@/components/AQSummary';
import AQMap from '@/components/AQMap';

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <AQSummary />
        <AQMap />
      </main>
      <footer className="bg-secondary py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-muted-foreground">
            ClearSkies Community Air Quality Monitoring Platform
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Demo application with simulated data • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
