import express from "express";
import axios from "axios";
import cors from "cors";
import { calculateAQI, getAQICategory } from "./aqiUtils"; // Update path as needed

const app = express();
const PORT = 3001;

app.use(cors());

// ------------------------
// Interfaces
// ------------------------
interface Sensor {
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
  pressure: number;
  aqi?: number;
  aqiCategory?: {
    category: string;
    color: string;
  };
}

interface HistoricalDataPoint {
  timestamp: Date;
  pm25: number;
  temperature: number;
  humidity: number;
}

// ------------------------
// Utilities
// ------------------------
const randomInRange = (min: number, max: number) =>
  Math.random() * (max - min) + min;

// Fetch all PM2.5 sensor data from the API
async function fetchPM25Data(): Promise<any> {
  const url =
    "https://www.simpleaq.org/api/getdata?field=pm2.5&min_lat=-90&max_lat=90&min_lon=-180&max_lon=180&utc_epoch=1743899940000";
  const response = await axios.get(url);
  return response.data;
}

// Generate sensor objects from raw API data
async function generateSensors(sensorJson: any): Promise<Sensor[]> {
  const field = "pm2.5_ug_m3";
  const rangeHours = 1;

  const sensors: Sensor[] = await Promise.all(
    Object.entries(sensorJson).map(async ([id, sensorData]: [string, any]) => {
      const { name, latitude, longitude, timestamp, value } = sensorData;

      try {
        const url = `https://www.simpleaq.org/api/getgraphdata?id=${name}&field=${field}&rangehours=${rangeHours}&time=${encodeURIComponent(
          timestamp
        )}`;
        const response = await axios.get(url);
        const values = response.data?.data;
        const pm25 = parseFloat(values?.[values.length - 1]?.value || value);

        return {
          id,
          name,
          location: { lat: parseFloat(latitude), lng: parseFloat(longitude) },
          pm25,
          temperature: randomInRange(18, 35),
          humidity: randomInRange(30, 80),
          pressure: randomInRange(990, 1030),
          lastUpdated: new Date(timestamp),
          aqi: calculateAQI(pm25),
          aqiCategory: getAQICategory(pm25),
        };
      } catch (error) {
        console.error(`Error for sensor ${name}`, error);
        return null;
      }
    })
  );

  return sensors.filter(Boolean);
}

// Generate 7-day hourly historical data
function generateHistoricalData(
  days = 7,
  pointsPerDay = 24,
  baselinePM25 = 15
): HistoricalDataPoint[] {
  const now = new Date();
  const result: HistoricalDataPoint[] = [];

  for (let day = 0; day < days; day++) {
    for (let point = 0; point < pointsPerDay; point++) {
      const timestamp = new Date(now);
      timestamp.setDate(now.getDate() - day);
      timestamp.setHours(Math.floor((24 * point) / pointsPerDay));
      timestamp.setMinutes(0);
      timestamp.setSeconds(0);

      const hour = timestamp.getHours();
      let pm25Factor = 1;
      if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
        pm25Factor = 1.5 + Math.random() * 0.5;
      } else if (hour >= 22 || hour <= 5) {
        pm25Factor = 0.7 + Math.random() * 0.3;
      }

      const dayOfWeek = (now.getDay() - day) % 7;
      if (dayOfWeek === 0 || dayOfWeek === 6) pm25Factor *= 0.85;
      const randomFactor = 0.8 + Math.random() * 0.4;
      const pm25 = baselinePM25 * pm25Factor * randomFactor;

      result.push({
        timestamp,
        pm25,
        temperature: 20 + 10 * Math.sin((Math.PI * hour) / 12) + randomInRange(-2, 2),
        humidity: 50 + 15 * Math.cos((Math.PI * hour) / 12) + randomInRange(-5, 5),
      });
    }
  }

  return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

// Generate hourly chart data
function generate24HourData() {
  const now = new Date();
  const data = [];

  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(now);
    timestamp.setHours(now.getHours() - 23 + i, 0, 0, 0);

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
}

// Statistics
function calculateStatistics(sensorData: Sensor[]) {
  const pm25Values = sensorData.map((sensor) => sensor.pm25);

  return {
    averagePM25: pm25Values.reduce((sum, val) => sum + val, 0) / pm25Values.length,
    maxPM25: Math.max(...pm25Values),
    minPM25: Math.min(...pm25Values),
    aqiDistribution: sensorData.reduce<Record<string, number>>((acc, sensor) => {
      const category = sensor.aqiCategory?.category || "Unknown";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {}),
  };
}

// ------------------------
// Caching & Refreshing
// ------------------------
let sensors: Sensor[] = [];
let historicalData: Record<string, HistoricalDataPoint[]> = {};
let hourlyData = [];
let statistics = {};

async function refreshData() {
  try {
    const raw = await fetchPM25Data();
    sensors = await generateSensors(raw);
    historicalData = sensors.reduce((acc, sensor) => {
      acc[sensor.id] = generateHistoricalData(7, 24, sensor.pm25 * 0.8);
      return acc;
    }, {});
    hourlyData = generate24HourData();
    statistics = calculateStatistics(sensors);

    console.log("✅ Data refreshed:", new Date().toISOString());
  } catch (err) {
    console.error("❌ Failed to refresh data:", err.message);
  }
}

refreshData();
setInterval(refreshData, 10 * 60 * 1000); // every 10 minutes

// ------------------------
// API Endpoints
// ------------------------
app.get("/api/sensors", (req, res) => res.json(sensors));
app.get("/api/historical", (req, res) => res.json(historicalData));
app.get("/api/hourly", (req, res) => res.json(hourlyData));
app.get("/api/statistics", (req, res) => res.json(statistics));

// ------------------------
app.listen(PORT, () => {
  console.log(`🌐 Server is running at http://localhost:${PORT}`);
});
