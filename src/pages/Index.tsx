
import React from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import AQSummary from '@/components/AQSummary';
import AQMap from '@/components/AQMap';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <AQSummary />
        <section className="py-12 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-semibold tracking-tight">Community Air Quality Map</h2>
              <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
                Explore air quality readings from sensors across the community. 
              </p>
              <div className="mt-6">
                <Link to="/map">
                  <Button size="lg">
                    View Full Map
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative w-full h-[400px] rounded-xl shadow-sm overflow-hidden">
              <AQMap />
            </div>
          </div>
        </section>
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
