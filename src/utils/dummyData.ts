
import { calculateAQI, getAQICategory } from './aqiUtils';

// Sensor types and interfaces
export interface Sensor {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  pm25: number;
  temperature: number;
  humidity: number;
  lastUpdated: Date;
  aqi?: number;
  aqiCategory?: {
    category: string;
    color: string;
  };
}

export interface HistoricalDataPoint {
  timestamp: Date;
  pm25: number;
  temperature: number;
  humidity: number;
}

// Generate random number within range
const randomInRange = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

// Generate dummy sensor data
export const generateSensors = (count: number = 10): Sensor[] => {
  // Central coordinates (approximately Boulder, CO)
  const centerLat = 40.014984;
  const centerLng = -105.270546;
  
  // Radius for sensor distribution (in degrees)
  const radius = 0.05;
  
  return Array.from({ length: count }, (_, i) => {
    // Generate random PM2.5 values with a bias toward healthier readings
    const isPolluted = Math.random() > 0.7;
    let pm25: number;
    
    if (isPolluted) {
      pm25 = randomInRange(35, 180); // Unhealthy range
    } else {
      pm25 = randomInRange(5, 35); // Good to moderate range
    }
    
    // Generate random coordinates within radius
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;
    const lat = centerLat + distance * Math.cos(angle);
    const lng = centerLng + distance * Math.sin(angle);
    
    // Calculate AQI and get category
    const aqi = calculateAQI(pm25);
    const aqiCategory = getAQICategory(pm25);
    
    return {
      id: `sensor-${i + 1}`,
      name: `Sensor ${i + 1}`,
      location: {
        lat,
        lng,
      },
      pm25,
      temperature: randomInRange(18, 35),
      humidity: randomInRange(30, 80),
      lastUpdated: new Date(Date.now() - randomInRange(0, 3600000)), // Within the last hour
      aqi,
      aqiCategory,
    };
  });
};

// Generate historical data for a single sensor
export const generateHistoricalData = (
  days: number = 7,
  pointsPerDay: number = 24,
  baselinePM25: number = 15
): HistoricalDataPoint[] => {
  const now = new Date();
  const result: HistoricalDataPoint[] = [];
  
  for (let day = 0; day < days; day++) {
    for (let point = 0; point < pointsPerDay; point++) {
      // Create timestamps evenly distributed throughout the period
      const timestamp = new Date(now);
      timestamp.setDate(now.getDate() - day);
      timestamp.setHours(Math.floor(24 * point / pointsPerDay));
      timestamp.setMinutes(0);
      timestamp.setSeconds(0);
      
      // Generate data with daily patterns
      // Morning and evening "rush hours" have higher pollution
      const hour = timestamp.getHours();
      let pm25Factor = 1;
      
      // Rush hour patterns
      if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
        pm25Factor = 1.5 + Math.random() * 0.5;
      } 
      // Nighttime is generally cleaner
      else if (hour >= 22 || hour <= 5) {
        pm25Factor = 0.7 + Math.random() * 0.3;
      }
      
      // Weekend vs weekday variations
      const dayOfWeek = (now.getDay() - day) % 7;
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
        pm25Factor *= 0.85;
      }
      
      // Random variations
      const randomFactor = 0.8 + Math.random() * 0.4;
      
      // Final calculation
      const pm25 = baselinePM25 * pm25Factor * randomFactor;
      
      result.push({
        timestamp,
        pm25,
        temperature: 20 + 10 * Math.sin(Math.PI * hour / 12) + randomInRange(-2, 2),
        humidity: 50 + 15 * Math.cos(Math.PI * hour / 12) + randomInRange(-5, 5),
      });
    }
  }
  
  // Sort by timestamp in ascending order
  return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

// Generate current sensor data
export const sensors = generateSensors(15);

// Generate historical data for each sensor
export const historicalData = sensors.reduce<Record<string, HistoricalDataPoint[]>>((acc, sensor) => {
  acc[sensor.id] = generateHistoricalData(7, 24, sensor.pm25 * 0.8);
  return acc;
}, {});

// Calculate air quality statistics
export const calculateStatistics = (sensorData: Sensor[]) => {
  const pm25Values = sensorData.map(sensor => sensor.pm25);
  
  return {
    averagePM25: pm25Values.reduce((sum, val) => sum + val, 0) / pm25Values.length,
    maxPM25: Math.max(...pm25Values),
    minPM25: Math.min(...pm25Values),
    aqiDistribution: sensorData.reduce<Record<string, number>>((acc, sensor) => {
      const category = sensor.aqiCategory?.category || 'Unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {}),
  };
};

// Generate time series data for 24 hours
export const generate24HourData = () => {
  const data = [];
  const now = new Date();
  
  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(now);
    timestamp.setHours(now.getHours() - 23 + i);
    timestamp.setMinutes(0);
    timestamp.setSeconds(0);
    
    // Morning and evening peaks
    const hour = timestamp.getHours();
    let basePM25 = 15;
    
    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
      basePM25 = 30 + Math.random() * 15;
    } else if (hour >= 22 || hour <= 5) {
      basePM25 = 10 + Math.random() * 5;
    } else {
      basePM25 = 15 + Math.random() * 10;
    }
    
    data.push({
      time: timestamp,
      pm25: basePM25,
      aqi: calculateAQI(basePM25),
    });
  }
  
  return data;
};

// Data for the 24-hour chart
export const hourlyData = generate24HourData();
