import React, { useState, useEffect } from 'react';
import { 
  Wind, 
  Thermometer, 
  CloudRain, 
  AlertCircle,
} from 'lucide-react';
import axios from 'axios';
import { formatPM25 } from '@/utils/aqiUtils';
import AQIChart from './AQIChart';
import DataTable from './DataTable';
import DataCard from '@/components/ui/DataCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardPage = () => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [realSensors, setRealSensors] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);

  // Fetch real-time sensor and hourly data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [sensorResponse, hourlyResponse] = await Promise.all([
          axios.get("http://localhost:3001/api/sensors"),
          axios.get("http://localhost:3001/api/hourly"),
        ]);
        setRealSensors(sensorResponse.data);
        setHourlyData(hourlyResponse.data);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
        setIsLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(intervalId);
  }, []);

  if (error) {
    return (
      <div className="py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center text-red-500">
            <h2 className="text-xl font-semibold">Error loading data</h2>
            <p className="mt-2">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !realSensors || !hourlyData) {
    return (
      <div className="py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-8">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="lg:col-span-2 h-[400px]" />
            <div className="space-y-5">
              <Skeleton className="h-[300px]" />
              <Skeleton className="h-[200px]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const stats = {
    averagePM25: realSensors.reduce((sum, s) => sum + s.pm25, 0) / realSensors.length,
    maxPM25: Math.max(...realSensors.map(s => s.pm25)),
    minPM25: Math.min(...realSensors.map(s => s.pm25)),
  };

  // Calculate daily average
  const dailyAvg = hourlyData.reduce((sum, item) => sum + item.pm25, 0) / hourlyData.length;

  // Find highest pollution sensors
  const highestSensors = [...realSensors]
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
            value={`${(realSensors.reduce((sum, s) => sum + s.temperature, 0) / realSensors.length).toFixed(1)} °C`}
            icon={<Thermometer className="h-5 w-5 text-primary" />}
            description="Mean temperature across stations"
          />
          <DataCard
            title="Average Humidity"
            value={`${Math.round(realSensors.reduce((sum, s) => sum + s.humidity, 0) / realSensors.length)}%`}
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

            {/* Pollution Hotspots */}
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