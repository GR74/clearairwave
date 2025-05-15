import React, { useEffect, useState } from 'react';
import { Line, Bar, LineChart, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { historicalData, generateHistoricalData } from '@/utils/dummyData';
import { formatPM25 } from '@/utils/aqiUtils';

interface AQIChartProps {
  type?: 'line' | 'bar';
  data?: any[];
  timeRange?: '24h' | '7d' | '30d';
  sensorId?: string;
  height?: number;
}

const AQIChart: React.FC<AQIChartProps> = ({ 
  type = 'line', 
  data,
  timeRange = '24h', 
  sensorId = 'sensor-2',
  height = 300
}) => {
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHourlyData = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/hourly');
        const formattedData = response.data.map((item: any) => ({
          ...item,
          time: new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        setHourlyData(formattedData);
        setError(null);
      } catch (err) {
        setError('Failed to fetch hourly data');
        console.error('Error fetching hourly data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (timeRange === '24h') {
      fetchHourlyData();
    } else {
      setLoading(false);
    }
  }, [timeRange]);

  // If no custom data is provided, use the appropriate data based on timeRange
  const chartData = data || (() => {
    if (timeRange === '24h') {
      return hourlyData;
    } else {
      // Generate historical data for the specified time range
      const days = timeRange === '7d' ? 7 : 30;
      const historicalDataPoints = generateHistoricalData(days, 24);
      console.log('Generated Historical Data:', historicalDataPoints);
      
      // Format the data for the chart
      const formattedData = historicalDataPoints.map(item => ({
        time: new Date(item.timestamp).toLocaleDateString(),
        pm25: item.pm25,
        temperature: item.temperature,
        humidity: item.humidity,
      }));
      
      console.log('Formatted Historical Data:', formattedData);
      return formattedData;
    }
  })();

  console.log('Final Chart Data:', chartData);

  // Determine the y-axis domain based on the data
  const maxPM25 = Math.ceil(Math.min(Math.max(...chartData.map((d: any) => d.pm25)) * 1.2, 500)); // Cap at 500 µg/m³ and round up
  
  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 rounded-md shadow-sm text-sm">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'PM2.5' ? `${formatPM25(entry.value)} µg/m³` : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading && timeRange === '24h') {
    return <div className="w-full h-[300px] flex items-center justify-center">Loading...</div>;
  }

  if (error && timeRange === '24h') {
    return <div className="w-full h-[300px] flex items-center justify-center text-red-500">{error}</div>;
  }

  if (!chartData || chartData.length === 0) {
    return <div className="w-full h-[300px] flex items-center justify-center">No data available</div>;
  }
  
  return (
    <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={height}>
        {type === 'line' ? (
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }} 
              tickLine={false}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              domain={[0, maxPM25]}
              tickLine={false}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="pm25" 
              name="PM2.5"
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 5 }}
              animationDuration={1500}
            />
            {chartData[0]?.temperature && (
              <Line 
                type="monotone" 
                dataKey="temperature" 
                name="Temperature"
                stroke="#f97316" 
                strokeWidth={2} 
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
                animationDuration={1500}
              />
            )}
            {chartData[0]?.humidity && (
              <Line 
                type="monotone" 
                dataKey="humidity" 
                name="Humidity"
                stroke="#0ea5e9" 
                strokeWidth={2} 
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
                animationDuration={1500}
              />
            )}
          </LineChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }} 
              tickLine={false}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              domain={[0, maxPM25]}
              tickLine={false}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="pm25" 
              name="PM2.5"
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]}
              animationDuration={1500}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default AQIChart;