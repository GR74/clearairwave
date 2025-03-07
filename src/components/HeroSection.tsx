
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Wind, Thermometer, CloudRain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateStatistics, sensors } from '@/utils/dummyData';
import { formatPM25 } from '@/utils/aqiUtils';
import DataCard from '@/components/ui/DataCard';

const HeroSection = () => {
  const stats = calculateStatistics(sensors);
  const avgAQI = Math.round(sensors.reduce((sum, sensor) => sum + (sensor.aqi || 0), 0) / sensors.length);
  
  // Count the number of sensors in each category
  const goodCount = sensors.filter(s => s.aqiCategory?.category === 'Good').length;
  const percentage = Math.round((goodCount / sensors.length) * 100);

  return (
    <div className="relative pb-12 pt-28 md:pb-16 md:pt-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none -z-10 opacity-30 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50" />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="md:flex md:justify-between md:gap-16 items-center">
          <div className="md:flex-1 space-y-8">
            <div className="space-y-5 max-w-2xl">
              <span className="inline-flex items-center px-3 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
                Real-time air quality monitoring
              </span>
              
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight sm:leading-tight">
                Breathe with confidence. 
                <span className="text-primary block mt-1">Know your air.</span>
              </h1>
              
              <p className="text-lg text-muted-foreground">
                ClearSkies Community AQ provides real-time air quality monitoring for your community, 
                helping you make informed decisions about outdoor activities and health protection.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <Button asChild size="lg" className="rounded-full px-6 group">
                <Link to="/dashboard">
                  View Dashboard
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="lg" className="rounded-full px-6">
                <Link to="/map">Explore Map</Link>
              </Button>
            </div>
          </div>
          
          <div className="md:flex-1 mt-12 md:mt-0 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <DataCard
              title="Average PM2.5"
              value={`${formatPM25(stats.averagePM25)} µg/m³`}
              icon={<Wind className="h-5 w-5 text-primary" />}
              description="Across all monitoring stations"
              cardClassName="animate-slide-up [animation-delay:100ms]"
            />
            
            <DataCard
              title="Current AQI"
              value={avgAQI}
              icon={<Thermometer className="h-5 w-5 text-primary" />}
              description="Air Quality Index (average)"
              cardClassName="animate-slide-up [animation-delay:200ms]"
            />
            
            <DataCard
              title="Clean Air Zones"
              value={`${percentage}%`}
              icon={<CloudRain className="h-5 w-5 text-primary" />}
              description={`${goodCount} of ${sensors.length} sensors reporting good air`}
              cardClassName="animate-slide-up [animation-delay:300ms]"
            />
            
            <div className="glass-card rounded-xl p-5 flex items-center justify-center animate-slide-up [animation-delay:400ms]">
              <div className="text-center">
                <div className="text-sm font-medium text-muted-foreground mb-1">Live Sensors</div>
                <div className="text-2xl font-semibold">
                  {sensors.length}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Monitoring stations online
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
