from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
import random
import math
from pydantic import BaseModel
from typing import List, Dict, Optional

# ----------------------------------------
# AQI Utility Functions (from aqiUtils.ts)
# i lovemen
# ----------------------------------------

AQI_BREAKPOINTS = [
    {"min": 0, "max": 12, "category": "Good", "color": "#4ade80"},
    {"min": 12.1, "max": 35.4, "category": "Moderate", "color": "#facc15"},
    {"min": 35.5, "max": 55.4, "category": "Unhealthy for Sensitive Groups", "color": "#fb923c"},
    {"min": 55.5, "max": 150.4, "category": "Unhealthy", "color": "#f87171"},
    {"min": 150.5, "max": 250.4, "category": "Very Unhealthy", "color": "#c084fc"},
    {"min": 250.5, "max": 500, "category": "Hazardous", "color": "#ef4444"}
]

def calculate_aqi(pm25: float) -> int:
    if pm25 < 0:
        return 0
    for i, bp in enumerate(AQI_BREAKPOINTS):
        if pm25 <= bp["max"]:
            lower_aqi = 0 if i == 0 else i * 50
            upper_aqi = lower_aqi + 50
            lower_conc = bp["min"]
            upper_conc = bp["max"]
            aqi = ((upper_aqi - lower_aqi) / (upper_conc - lower_conc)) * (pm25 - lower_conc) + lower_aqi
            return round(aqi)
    return 500

def get_aqi_category(pm25: float) -> dict:
    for bp in AQI_BREAKPOINTS:
        if pm25 <= bp["max"]:
            return {"category": bp["category"], "color": bp["color"]}
    return {"category": "Hazardous", "color": "#ef4444"}

def get_health_recommendations(category: str) -> str:
    if category == "Good":
        return "Air quality is satisfactory, and air pollution poses little or no risk."
    elif category == "Moderate":
        return ("Air quality is acceptable. However, some pollutants may be a concern for "
                "a small number of people who are unusually sensitive to air pollution.")
    elif category == "Unhealthy for Sensitive Groups":
        return ("Members of sensitive groups may experience health effects. The general public is "
                "less likely to be affected.")
    elif category == "Unhealthy":
        return ("Some members of the general public may experience health effects; members of sensitive "
                "groups may experience more serious health effects.")
    elif category == "Very Unhealthy":
        return "Health alert: The risk of health effects is increased for everyone."
    elif category == "Hazardous":
        return "Health warning of emergency conditions: everyone is more likely to be affected."
    else:
        return "Air quality information is currently unavailable."

def format_pm25(pm25: float) -> str:
    return f"{pm25:.1f}"

# ----------------------------------------
# Pydantic Models for API Data
# ----------------------------------------

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

# ----------------------------------------
# Global Data Store
# ----------------------------------------

DATA = {
    "sensors": [],
    "historical": {},
    "hourly": [],
    "statistics": {}
}

# ----------------------------------------
# Data Fetching and Generation Functions
# ----------------------------------------

def fetch_pm25_data() -> dict:
    url = (
        "https://www.simpleaq.org/api/getdata?field=pm2.5"
        "&min_lat=-90&max_lat=90&min_lon=-180&max_lon=180"
        "&utc_epoch=1743899940000"
    )
    try:
        response = httpx.get(url, timeout=10.0)
        response.raise_for_status()
        print("Fetched PM2.5 data")
        # print("Response:", response.json())
        return response.json()
    except Exception as e:
        print("Error fetching PM2.5 data:", str(e))
        return {}
    
def fetch_relative_humidity_data() -> dict:
    url = (
        "https://www.simpleaq.org/api/getdata?field=relativehumidity"
        "&min_lat=-90&max_lat=90&min_lon=-180&max_lon=180"
        "&utc_epoch=1744612200000"
    )
    try:
        response = httpx.get(url, timeout=10.0)
        response.raise_for_status()
        print("Fetched relative humidity data")
        return response.json()
    except Exception as e:
        print("Error fetching relative humidity data:", str(e))
        return {}

def fetch_temperature_data() -> dict:
    url = (
        "https://www.simpleaq.org/api/getdata?field=temperature"
        "&min_lat=-90&max_lat=90&min_lon=-180&max_lon=180"
        "&utc_epoch=1744612200000"
    )
    try:
        response = httpx.get(url, timeout=10.0)
        response.raise_for_status()
        print("Fetched temperature data")
        return response.json()
    except Exception as e:
        print("Error fetching temperature data:", str(e))
        return {}
    

def random_in_range(min_val: float, max_val: float) -> float:
    return random.uniform(min_val, max_val)

def generate_sensors(sensor_json: dict) -> List[Sensor]:
    humidity_data = fetch_relative_humidity_data()
    temperature_data = fetch_temperature_data()  # Fetch temperature data
    sensors = []
    for sensor_id, sensor_data in sensor_json.items():
        try:
            idN = sensor_id
            name = sensor_data.get("name")
            latitude = sensor_data.get("latitude")
            longitude = sensor_data.get("longitude")
            timestamp_str = sensor_data.get("timestamp")
            value = sensor_data.get("value")
            
            # Fetch additional graph data for PM2.5
            field = "pm2.5_ug_m3"
            range_hours = 1
            url = f"https://www.simpleaq.org/api/getgraphdata?id={idN}&field={field}&rangehours={range_hours}&time={timestamp_str}"
            r = httpx.get(url, timeout=10.0)
            r.raise_for_status()
            print("each sensor data: ", r.json())
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
                id=idN,
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
            hour = int((24 * point) / points_per_day)
            timestamp = timestamp.replace(hour=hour, minute=0, second=0, microsecond=0)
            
            pm25_factor = 1.0
            if (7 <= hour <= 9) or (16 <= hour <= 19):
                pm25_factor = 1.5 + random.random() * 0.5
            elif hour >= 22 or hour <= 5:
                pm25_factor = 0.7 + random.random() * 0.3
            
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

# ----------------------------------------
# FastAPI App Setup
# ----------------------------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict this to your frontend URL(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# ----------------------------------------
# Run the Server (Uvicorn)
# ----------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)
