import React, { useEffect, useState } from 'react';
import {
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';
import { formatPM25 } from '@/utils/aqiUtils';

interface AQIChartProps {
  type?: 'line' | 'bar';
  data?: any[];
  timeRange?: '24h' | '7d' | '30d';
  sensorId?: string;
  selectedMetric?: 'pm25' | 'temperature' | 'humidity';
  height?: number;
}


const AQIChart: React.FC<AQIChartProps> = ({
  type = 'line',
  data,
  timeRange = '24h',
  sensorId,
  height = 300,
  selectedMetric= 'pm25',
}) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data only if `data` is not passed
  useEffect(() => {
    if (data || !sensorId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
    
        let responseData;
    
        if (timeRange === '24h') {
          // Fetch real 24-hour data from /api/hourly
          const response = await axios.get('http://localhost:3001/api/hourly');
          responseData = response.data.map(item => ({
            ...item,
            time: new Date(item.time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          }));
        } else {
          // Fetch simulated data from /api/historical
          const response = await axios.get('http://localhost:3001/api/historical', {
            params: { sensor_id: sensorId },
          });
    
          const now = new Date();
          let filtered = [...response.data];
    
          if (timeRange === '7d') {
            filtered = filtered
              .filter(item => new Date(item.timestamp) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
              .filter((_, i) => i % 6 === 0);
          } else if (timeRange === '30d') {
            filtered = filtered
              .filter(item => new Date(item.timestamp) > new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))
              .filter((_, i) => i % 24 === 0);
          }
    
          responseData = filtered.map(item => ({
            ...item,
            time: new Date(item.timestamp).toLocaleDateString(),
          }));
        }
    
        setChartData(responseData);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to load chart data');
      } finally {
        setLoading(false);
      }
    };
    

    fetchData();
  }, [sensorId, timeRange, data]);

  const finalData = data || chartData;

  const maxPM25 =
    finalData.length > 0
      ? Math.ceil(Math.min(Math.max(...finalData.map(d => d.pm25 || 0)) * 1.2, 500))
      : 500;

  const hasTemperature = finalData.some(d => d.temperature !== undefined);
  const hasHumidity = finalData.some(d => d.humidity !== undefined);

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

  if ((loading && !data) || finalData.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        {loading ? 'Loading...' : 'No data available'}
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={height}>
        {type === 'line' ? (
          <LineChart data={finalData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis
              label={{ value: 'µg/m³', angle: -90, position: 'insideLeft' }}
              domain={[0, maxPM25]}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
  type="monotone"
  dataKey={selectedMetric}
  name={
    selectedMetric === 'pm25'
      ? 'PM2.5'
      : selectedMetric === 'temperature'
      ? 'Temperature'
      : 'Humidity'
  }
  stroke={
    selectedMetric === 'pm25'
      ? '#3b82f6'
      : selectedMetric === 'temperature'
      ? '#f97316'
      : '#0ea5e9'
  }
  strokeWidth={2}
  dot={{ r: 2 }}
  activeDot={{ r: 5 }}
  animationDuration={1500}
/>

          </LineChart>
        ) : (
          <BarChart data={finalData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis
              label={{ value: 'µg/m³', angle: -90, position: 'insideLeft' }}
              domain={[0, maxPM25]}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="pm25" name="PM2.5" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default AQIChart;
