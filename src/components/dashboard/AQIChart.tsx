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
  Text,
} from 'recharts';
import axios from 'axios';
import { formatPM25 } from '@/utils/aqiUtils';

interface AQIChartProps {
  type?: 'line' | 'bar';
  data?: any[];
  timeRange?: '24h' | '7d' | '30d';
  sensorId?: string;
  selectedMetric?: string;
  height?: number;
}

const metricAliasMap: Record<string, string> = {
  'pm2.5': 'pm25',
};

const AQIChart: React.FC<AQIChartProps> = ({
  type = 'line',
  data,
  timeRange = '24h',
  sensorId,
  height = 300,
  selectedMetric,
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
          const response = await axios.get('http://localhost:3001/api/hourly', {
            params: {
              sensor_id: sensorId,
              metric: selectedMetric,
            },

          });

          const backendField = metricAliasMap[selectedMetric!] || selectedMetric!;

          responseData = response.data.map(item => ({
            time: new Date(item.time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            [selectedMetric!]: item[backendField],
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
  }, [sensorId, timeRange, data, selectedMetric]);

  const dataKey = metricAliasMap[selectedMetric!] || selectedMetric!;

  const finalData = data || chartData;
  const getMaxValue = () => {
    const values = finalData.map(d => d[selectedMetric!] ?? 0);
    const max = Math.max(...values);

    const metricMaxStrategies: Record<string, () => number> = {
      'pm25': () => Math.ceil(Math.min(max * 1.2, 500)),
      'pm2.5': () => Math.ceil(Math.min(max * 1.2, 500)),
      'pm10': () => Math.ceil(Math.min(max * 1.2, 500)),
      'pm4': () => Math.ceil(Math.min(max * 1.2, 500)),
      'pm1': () => Math.ceil(Math.min(max * 1.2, 500)),
      'temperature': () => Math.ceil(max + 5),
      'humidity': () => 100,
      'pressure': () => Math.ceil(max + 10),
      'NO2': () => Math.ceil(Math.min(max * 1.2, 5)),
      'O3': () => Math.ceil(Math.min(max * 1.2, 5)),
      'SO2': () => Math.ceil(Math.min(max * 1.2, 5)),
    };

    const fallback = () => Math.ceil(max * 1.1);
    return (metricMaxStrategies[selectedMetric!] || fallback)();
  };


  const metricColors: Record<string, string> = {
    'pm2.5': '#3b82f6',
    'pm10': '#60a5fa',
    'pm4': '#818cf8',
    'pm1': '#7dd3fc',
    'temperature': '#f97316',
    'humidity': '#0ea5e9',
    'pressure': '#a855f7',
    'NO2': '#ef4444',
    'O3': '#22c55e',
    'SO2': '#eab308',
    'pm25': '#3b82f6', // fallback for pm25 alias
  };
  const chartColor = metricColors[selectedMetric || 'pm2.5'] || '#64748b';

  const metricUnits: Record<string, string> = {
    'pm2.5': 'µg/m³',
    'pm10': 'µg/m³',
    'pm4': 'µg/m³',
    'pm1': 'µg/m³',
    'temperature': '°C',
    'humidity': '%',
    'pressure': 'hPa',
    'NO2': 'ppm',
    'O3': 'ppm',
    'SO2': 'ppm',
    'pm25': 'µg/m³',
  };
  const yLabel = metricUnits[selectedMetric || 'pm2.5'] || '';


  const maxValue = getMaxValue();


  const hasTemperature = finalData.some(d => d.temperature !== undefined);
  const hasHumidity = finalData.some(d => d.humidity !== undefined);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 rounded-md shadow-sm text-sm">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {entry.name}: {entry.value} {metricUnits[selectedMetric || 'pm2.5']}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  if ((loading && !data) || finalData.length === 0) {
    return (
      <div className="w-full h-[300px] flex flex-col items-center justify-center animate-fade-in">
        <div className="relative w-16 h-16 mb-4">
          {/* Outer Ring - Orbit Spin */}
          <div className="absolute inset-0 rounded-full border-[6px] border-t-transparent border-l-transparent border-aqi.good animate-spin-slow blur-sm opacity-100 shadow-[0_0_20px_#4ade80]" />

          {/* Middle Ring - Reverse Spin */}
          <div className="absolute inset-1 rounded-full border-[4px] border-r-transparent border-b-transparent border-aqi.moderate animate-spin-reverse blur-sm opacity-100" />

          {/* Core Pulse Dot */}
          <div className="absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-aqi.hazardous animate-ping-slow shadow-md" />
        </div>

        <p className="text-sm text-center text-muted-foreground animate-pulse-slow tracking-wide">
          {loading ? 'Fetching real-time air quality data...' : 'No data available'}
        </p>
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

  console.log("Selected metric:", selectedMetric);
  console.log("Resolved dataKey:", dataKey);
  console.log("Final data:", finalData);

  return (
    <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={finalData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

          <XAxis
            dataKey="time"
            tick={(props) => {
              const { x, y, payload } = props;
              return (
                <Text
                  x={x}
                  y={y}
                  angle={-45}
                  textAnchor="end"
                  verticalAnchor="middle"
                  fontSize={10}
                  fill="#666"
                >
                  {payload.value}
                </Text>
              );
            }}
            height={60}
          />

          <YAxis
            label={{
              value: yLabel,
              angle: -90,
              position: 'insideLeft',
            }}

            domain={[0, maxValue]}
            tick={{ fontSize: 12 }}
          />

          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey={selectedMetric}
            name={selectedMetric?.toUpperCase()}

            stroke={chartColor}
            fill={chartColor}

            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 5 }}
            animationDuration={1500}
          />

        </LineChart>

      </ResponsiveContainer>
    </div>

  );

};

export default AQIChart;