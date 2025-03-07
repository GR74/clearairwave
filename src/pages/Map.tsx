
import React from 'react';
import Header from '@/components/Header';
import AQMap from '@/components/AQMap';

const Map = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold tracking-tight">Air Quality Map</h1>
          <p className="text-muted-foreground mt-2 mb-8">
            Explore real-time air quality readings from sensors across the community
          </p>
          <div className="h-[700px]">
            <AQMap />
          </div>
        </div>
      </main>
      <footer className="bg-secondary py-6">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs text-muted-foreground">
            ClearSkies Community Air Quality Monitoring Platform • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Map;
