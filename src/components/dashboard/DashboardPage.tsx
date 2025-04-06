
import React, { useState } from 'react';
import { 
  Wind, 
  Thermometer, 
  CloudRain, 
  Calendar, 
  BarChart2, 
  Clock, 
  AlertCircle,
  LineChart as LineChartIcon
} from 'lucide-react';
import { calculateStatistics, sensors, hourlyData } from '@/utils/dummyData';
import { formatPM25 } from '@/utils/aqiUtils';
import AQIChart from './AQIChart';
import DataTable from './DataTable';
import DataCard from '@/components/ui/DataCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DashboardPage = () => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const stats = calculateStatistics(sensors);
  
  // Calculate daily average
  const dailyAvg = hourlyData.reduce((sum, item) => sum + item.pm25, 0) / hourlyData.length;
  
  // Find highest pollution sensors
  const highestSensors = [...sensors]
    .sort((a, b) => b.pm25 - a.pm25)
    .slice(0, 3)
    .map(sensor => ({
      name: sensor.name,
      value: sensor.pm25,
      category: sensor.aqiCategory?.category || 'Unknown',
      color: sensor.aqiCategory?.color || '#000'
    }));
  
  // Prepare data for the daily distribution chart
  const timeDistribution = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    const hourLabel = `${hour}:00`;
    const readingForHour = hourlyData.find(item => {
      const itemHour = new Date(item.time).getHours();
      return itemHour === hour;
    });
    
    return {
      time: hourLabel,
      pm25: readingForHour?.pm25 || 0
    };
  });

  return (
    <div className="py-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Air Quality Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor air quality metrics and trends across the community
          </p>
        </div>
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <DataCard
            title="Current Average PM2.5"
            value={`${formatPM25(stats.averagePM25)} µg/m³`}
            icon={<Wind className="h-5 w-5 text-primary" />}
            description="Mean value across all stations"
            trend={{
              value: Math.round((stats.averagePM25 - dailyAvg) / dailyAvg * 100),
              isIncreasing: stats.averagePM25 > dailyAvg
            }}
          />
          
          <DataCard
            title="Maximum PM2.5"
            value={`${formatPM25(stats.maxPM25)} µg/m³`}
            icon={<AlertCircle className="h-5 w-5 text-primary" />}
            description="Highest reading in the network"
          />
          
          <DataCard
            title="Average Temperature"
            value={`${(sensors.reduce((sum, s) => sum + s.temperature, 0) / sensors.length).toFixed(1)} °C`}
            icon={<Thermometer className="h-5 w-5 text-primary" />}
            description="Mean temperature across stations"
          />
          
          <DataCard
            title="Average Humidity"
            value={`${Math.round(sensors.reduce((sum, s) => sum + s.humidity, 0) / sensors.length)}%`}
            icon={<CloudRain className="h-5 w-5 text-primary" />}
            description="Mean humidity across stations"
          />
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          {/* Main Line Chart */}
          <div className="lg:col-span-2 glass-card rounded-lg p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
              <h3 className="text-lg font-medium">Air Quality Trend</h3>
              
              <div className="flex">
                <Tabs defaultValue="24h" value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
                  <TabsList>
                    <TabsTrigger value="1h" className="text-xs">1h</TabsTrigger>
                    <TabsTrigger value="24h" className="text-xs">24h</TabsTrigger>
                    <TabsTrigger value="7d" className="text-xs">7 Days</TabsTrigger>
                    <TabsTrigger value="30d" className="text-xs">30 Days</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
            
            <AQIChart type="line" timeRange={timeRange} height={300} />
          </div>
          
          {/* Sidebar with stats and smaller charts */}
          <div className="space-y-5">
            {/* Time Distribution */}
            <div className="glass-card rounded-lg p-5">
              <div className="mb-4">
                <div className="text-lg font-medium mb-1">Daily Distribution</div>
                <div className="text-sm text-muted-foreground">PM2.5 levels by hour</div>
              </div>
              
              <AQIChart type="bar" data={timeDistribution} height={220} />
            </div>
            
            {/* Highest Pollution Areas */}
            <div className="glass-card rounded-lg p-5">
              <div className="mb-4">
                <div className="text-lg font-medium mb-1">Pollution Hotspots</div>
                <div className="text-sm text-muted-foreground">Highest PM2.5 readings</div>
              </div>
              
              <div className="space-y-4">
                {highestSensors.map((sensor, index) => (
                  <div key={index} className="flex items-center">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
                      style={{ backgroundColor: sensor.color }}
                    >
                      {index + 1}
                    </div>
                    
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-sm">{sensor.name}</div>
                      <div className="text-xs text-muted-foreground">{formatPM25(sensor.value)} µg/m³</div>
                    </div>
                    
                    <div 
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: `${sensor.color}15`,
                        color: sensor.color
                      }}
                    >
                      {sensor.category}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Data Table */}
        <DataTable />
      </div>
    </div>
  );
};

export default DashboardPage;
