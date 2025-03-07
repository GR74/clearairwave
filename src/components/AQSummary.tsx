
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDown, ArrowUp } from 'lucide-react';
import { calculateStatistics, sensors, hourlyData } from '@/utils/dummyData';
import { getAQICategory, formatPM25, getHealthRecommendations } from '@/utils/aqiUtils';
import { cn } from '@/lib/utils';

const AQSummary = () => {
  const stats = calculateStatistics(sensors);
  const currentAvgPM25 = stats.averagePM25;
  const avgAQICategory = getAQICategory(currentAvgPM25);
  
  // Check trend by comparing with 3 hours ago
  const threeHoursAgo = hourlyData[hourlyData.length - 4]?.pm25 || currentAvgPM25;
  const isImproving = currentAvgPM25 < threeHoursAgo;
  const changePercent = Math.round(Math.abs(currentAvgPM25 - threeHoursAgo) / threeHoursAgo * 100);
  
  const healthRecommendation = getHealthRecommendations(avgAQICategory.category);

  return (
    <section className="py-16 bg-gradient-to-b from-white to-blue-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div className="flex-1 space-y-6 max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight">Current Air Quality Status</h2>
            
            <div className="flex items-start gap-4">
              <div>
                <div 
                  className="text-5xl font-bold"
                  style={{ color: avgAQICategory.color }}
                >
                  {formatPM25(currentAvgPM25)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">µg/m³ (PM2.5)</div>
              </div>
              
              <div className="flex-1 mt-1">
                <div 
                  className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                    `bg-opacity-15 bg-${avgAQICategory.color.replace('#', '')} text-${avgAQICategory.color.replace('#', '')}`
                  )}
                  style={{ 
                    backgroundColor: `${avgAQICategory.color}20`, 
                    color: avgAQICategory.color 
                  }}
                >
                  {avgAQICategory.category}
                </div>
                
                <div className="flex items-center mt-2 text-sm">
                  <span 
                    className={cn(
                      "flex items-center",
                      isImproving ? "text-aqi-good" : "text-aqi-unhealthy"
                    )}
                  >
                    {isImproving ? (
                      <ArrowDown className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowUp className="h-4 w-4 mr-1" />
                    )}
                    {changePercent}% in the last 3 hours
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-muted-foreground">
              {healthRecommendation}
            </p>
            
            <div>
              <Link 
                to="/dashboard" 
                className="inline-flex items-center text-primary font-medium hover:underline"
              >
                View detailed air quality data
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-medium mb-4">Air Quality Index Scale</h3>
              
              <div className="space-y-3">
                {[
                  { label: 'Good', range: '0-12 µg/m³', color: '#4ade80' },
                  { label: 'Moderate', range: '12.1-35.4 µg/m³', color: '#facc15' },
                  { label: 'Unhealthy for Sensitive Groups', range: '35.5-55.4 µg/m³', color: '#fb923c' },
                  { label: 'Unhealthy', range: '55.5-150.4 µg/m³', color: '#f87171' },
                  { label: 'Very Unhealthy', range: '150.5-250.4 µg/m³', color: '#c084fc' },
                  { label: 'Hazardous', range: '250.5+ µg/m³', color: '#ef4444' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-3 flex-shrink-0" 
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-sm text-muted-foreground">{item.range}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AQSummary;
