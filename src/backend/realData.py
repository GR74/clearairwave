from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
import random
import math
from pydantic import BaseModel
from typing import List, Dict, Optional

# ------------------------
# Pydantic Models
# ------------------------

class Location(BaseModel):
    lat: float
    lng: float

class AQICategory(BaseModel):
    category: str
    color: str

class Sensor(BaseModel):
    id: str
    name: str
    location: Location
    pm25: float
    temperature: float
    humidity: float
    lastUpdated: datetime
    pressure: float
    aqi: Optional[float] = None
    aqiCategory: Optional[AQICategory] = None

class HistoricalDataPoint(BaseModel):
    timestamp: datetime
    pm25: float
    temperature: float
    humidity: float

class HourlyDataPoint(BaseModel):
    time: datetime
    pm25: float
    aqi: float

# ------------------------
# Global Data Store
# ------------------------

DATA = {
    "sensors": [],
    "historical": {},
    "hourly": [],
    "statistics": {}
}

# ------------------------
# AQI Calculation Functions (Dummy Implementation)
# ------------------------

def calculate_aqi(pm25: float) -> float:
    # Simplified (dummy) AQI calculation: adjust scaling as needed.
    return pm25 * 4

def get_aqi_category(pm25: float) -> AQICategory:
    aqi = calculate_aqi(pm25)
    if aqi <= 50:
        return AQICategory(category="Good", color="Green")
    elif aqi <= 100:
        return AQICategory(category="Moderate", color="Yellow")
    elif aqi <= 150:
        return AQICategory(category="Unhealthy for Sensitive Groups", color="Orange")
    elif aqi <= 200:
        return AQICategory(category="Unhealthy", color="Red")
    elif aqi <= 300:
        return AQICategory(category="Very Unhealthy", color="Purple")
    else:
        return AQICategory(category="Hazardous", color="Maroon")

def random_in_range(min_val: float, max_val: float) -> float:
    return random.uniform(min_val, max_val)

# ------------------------
# Data Fetching and Generation Functions
# ------------------------

def fetch_pm25_data() -> dict:
    url = ("https://www.simpleaq.org/api/getdata?field=pm2.5"
           "&min_lat=-90&max_lat=90&min_lon=-180&max_lon=180"
           "&utc_epoch=1743899940000")
    try:
        response = httpx.get(url, timeout=10.0)
        response.raise_for_status()
        print("Fetched PM2.5 data")
        return response.json()
    except Exception as e:
        print("Error fetching PM2.5 data:", str(e))
        return {}

def generate_sensors(sensor_json: dict) -> List[Sensor]:
    sensors = []
    for sensor_id, sensor_data in sensor_json.items():
        try:
            name = sensor_data.get("name")
            latitude = sensor_data.get("latitude")
            longitude = sensor_data.get("longitude")
            timestamp_str = sensor_data.get("timestamp")
            value = sensor_data.get("value")
            
            # Fetch additional graph data for PM2.5
            field = "pm2.5_ug_m3"
            range_hours = 1
            url = f"https://www.simpleaq.org/api/getgraphdata?id={name}&field={field}&rangehours={range_hours}&time={timestamp_str}"
            r = httpx.get(url, timeout=10.0)
            r.raise_for_status()
            graph_data = r.json().get("data", [])
            
            if graph_data and len(graph_data) > 0:
                try:
                    pm25 = float(graph_data[-1].get("value", value))
                except:
                    pm25 = float(value)
            else:
                pm25 = float(value)
            
            try:
                last_updated = datetime.fromisoformat(timestamp_str)
            except Exception:
                last_updated = datetime.now()
            
            sensor_obj = Sensor(
                id=sensor_id,
                name=name,
                location=Location(lat=float(latitude), lng=float(longitude)),
                pm25=pm25,
                temperature=random_in_range(18, 35),
                humidity=random_in_range(30, 80),
                pressure=random_in_range(990, 1030),
                lastUpdated=last_updated,
                aqi=calculate_aqi(pm25),
                aqiCategory=get_aqi_category(pm25)
            )
            sensors.append(sensor_obj)
        except Exception as e:
            print(f"Error processing sensor {sensor_data.get('name')}: {e}")
    return sensors

def generate_historical_data(days: int = 7, points_per_day: int = 24, baseline_pm25: float = 15) -> List[HistoricalDataPoint]:
    now = datetime.now()
    data_points = []
    for day in range(days):
        for point in range(points_per_day):
            timestamp = now - timedelta(days=day)
            # Distribute points evenly throughout each day
            hour = int((24 * point) / points_per_day)
            timestamp = timestamp.replace(hour=hour, minute=0, second=0, microsecond=0)
            
            # Daily pattern for PM2.5
            pm25_factor = 1.0
            if (7 <= hour <= 9) or (16 <= hour <= 19):
                pm25_factor = 1.5 + random.random() * 0.5
            elif hour >= 22 or hour <= 5:
                pm25_factor = 0.7 + random.random() * 0.3
            
            # Weekend factor: adjust if day is Saturday or Sunday
            day_of_week = (now.weekday() - day) % 7
            if day_of_week in (5, 6):
                pm25_factor *= 0.85
            
            random_factor = 0.8 + random.random() * 0.4
            pm25_value = baseline_pm25 * pm25_factor * random_factor
            
            temperature = 20 + 10 * math.sin((math.pi * hour) / 12) + random_in_range(-2, 2)
            humidity = 50 + 15 * math.cos((math.pi * hour) / 12) + random_in_range(-5, 5)
            
            data_points.append(HistoricalDataPoint(
                timestamp=timestamp,
                pm25=pm25_value,
                temperature=temperature,
                humidity=humidity
            ))
    data_points.sort(key=lambda x: x.timestamp)
    return data_points

def generate_24hour_data() -> List[HourlyDataPoint]:
    now = datetime.now()
    hourly = []
    for i in range(24):
        # Create timestamps starting 23 hours ago up to now
        timestamp = (now.replace(minute=0, second=0, microsecond=0) -
                     timedelta(hours=23 - i))
        hour = timestamp.hour
        if (7 <= hour <= 9) or (16 <= hour <= 19):
            base_pm25 = 30 + random.random() * 15
        elif hour >= 22 or hour <= 5:
            base_pm25 = 10 + random.random() * 5
        else:
            base_pm25 = 15 + random.random() * 10
        hourly.append(HourlyDataPoint(
            time=timestamp,
            pm25=base_pm25,
            aqi=calculate_aqi(base_pm25)
        ))
    return hourly

def calculate_statistics(sensors: List[Sensor]) -> Dict:
    if not sensors:
        return {}
    pm25_values = [sensor.pm25 for sensor in sensors]
    average = sum(pm25_values) / len(pm25_values)
    maximum = max(pm25_values)
    minimum = min(pm25_values)
    aqi_distribution = {}
    for sensor in sensors:
        category = sensor.aqiCategory.category if sensor.aqiCategory else "Unknown"
        aqi_distribution[category] = aqi_distribution.get(category, 0) + 1
    return {
        "averagePM25": average,
        "maxPM25": maximum,
        "minPM25": minimum,
        "aqiDistribution": aqi_distribution
    }

def refresh_data():
    print("Refreshing data...", datetime.now().isoformat())
    raw_data = fetch_pm25_data()
    sensors = generate_sensors(raw_data)
    historical = {}
    for sensor in sensors:
        historical[sensor.id] = generate_historical_data(7, 24, sensor.pm25 * 0.8)
    hourly = generate_24hour_data()
    stats = calculate_statistics(sensors)
    
    DATA["sensors"] = sensors
    DATA["historical"] = historical
    DATA["hourly"] = hourly
    DATA["statistics"] = stats
    print("Data refreshed", datetime.now().isoformat())

# Initial data load
refresh_data()

# ------------------------
# FastAPI App Setup
# ------------------------

app = FastAPI()

# Configure CORS (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Background Scheduler to refresh data every 10 minutes
scheduler = BackgroundScheduler()
scheduler.add_job(refresh_data, 'interval', minutes=10)
scheduler.start()

@app.get("/api/sensors", response_model=List[Sensor])
def get_sensors():
    return DATA["sensors"]

@app.get("/api/historical")
def get_historical():
    return DATA["historical"]

@app.get("/api/hourly", response_model=List[HourlyDataPoint])
def get_hourly():
    return DATA["hourly"]

@app.get("/api/statistics")
def get_statistics():
    return DATA["statistics"]

# ------------------------
# Run Server with Uvicorn
# ------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)
