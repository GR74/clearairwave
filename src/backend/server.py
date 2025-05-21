from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
import random
import math
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime, timezone

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
        "https://www.simpleaq.org/api/getdata?field=pm2.5&min_lat=-90&max_lat=90&min_lon=-180&max_lon=180&utc_epoch=1744612200000"
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

def random_in_range(min_val: float, max_val: float) -> float:
    return random.uniform(min_val, max_val)

def generate_sensors(sensor_json: dict) -> List[Sensor]:
    sensors = []
    for sensor_id, sensor_data in sensor_json.items():
        try:
            idN = sensor_id
            name = sensor_data.get("name")
            latitude = sensor_data.get("latitude")
            longitude = sensor_data.get("longitude")
            timestamp_str = datetime.now().isoformat()
            value = sensor_data.get("value") 
            range_hours = 1
            
            # Fetch additional graph data for PM2.5
            field = {"pm2.5_ug_m3" : 0, "pressure_hPa" : 0 ,"temperature_C" : 0, "humidity_percent" : 0}
            for f in field.keys():
                
                url = f"https://www.simpleaq.org/api/getgraphdata?id={idN}&field={f}&rangehours={range_hours}&time={timestamp_str}"
                field[f] = httpx.get(url, timeout=10.0)
                field[f].raise_for_status()
                # print("each sensor data: ", field[f].json())
                graph_data = field[f].json().get("value", [])
                # print("Graph data for field", f, ":", graph_data)
                
                if f == "pm2.5_ug_m3":
                    if graph_data and len(graph_data) > 0 :
                        try:
                            
                            pm25 = float(graph_data[-1])
                           
                        except:
                            pm25 = 0
                    else:
                        pm25 = float(value)
                elif f == "pressure_hPa":
                    if graph_data and len(graph_data) > 0:
                        try:
                            pressure = float(graph_data[-1])
                        except:
                            pressure = 0
                    else:
                        pressure = 0
                elif f == "temperature_C":
                    if graph_data and len(graph_data) > 0:
                        try:
                            temperature = float(graph_data[-1])
                        except:
                            temperature = 0
                    else:
                        temperature = 0
                elif f == "humidity_percent":    
                    if graph_data and len(graph_data) > 0:
                        try:
                            humidity = float(graph_data[-1])
                        except:
                            humidity = 0
                    else:
                        humidity = 0
                try:
                    last_updated = datetime.fromisoformat(timestamp_str)
                except Exception:
                    last_updated = datetime.now()
            
            sensor_obj = Sensor(
                id=idN,
                name=name,
                location=Location(lat=float(latitude), lng=float(longitude)),
                pm25=pm25,
                temperature=temperature,
                humidity=humidity,
                pressure=pressure,
                lastUpdated=last_updated,
                aqi=calculate_aqi(pm25),
                aqiCategory=get_aqi_category(pm25)
            )
            sensors.append(sensor_obj)
        except Exception as e:
            print(f"Error processing sensor {sensor_data.get('name')}: {e}")
    # print(sensors)
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
    # print(data_points)
    data_points.sort(key=lambda x: x.timestamp)
    return data_points


# def generate_historical_data(days: int = 30) -> Dict[str, List[Dict]]:
#     sensor_id = "clw9wuxop000bfi7rod4j6ae5"
#     # Start at midnight (UTC) `days-1` ago:
#     start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days-1)

#     historical: Dict[str, List[Dict]] = {sensor_id: []}
#     for day_offset in range(days):
#         day = start + timedelta(days=day_offset)
#         # Format the datetime in ISO format with 'Z' suffix
#         formatted_time = day.strftime("%Y-%m-%dT%H:%M:%S.000Z")

#         # 1. PM2.5 daily average via your existing generator
#         pm_records = generate_24hour_data(formatted_time, "pm2.5_ug_m3")
#         # print(pm_records)
#         pm25_avg = sum(r["pm25"] for r in pm_records) / len(pm_records)

#         # # 2. Temperature daily average
#         # temp_records = generate_24hour_data(formatted_time, "temperature_C")
#         # temp_avg = sum(r["temperature"] for r in temp_records) / len(temp_records)

#         # # 3. Humidity daily average
#         # hum_records = generate_24hour_data(formatted_time, "humidity_percent")
#         # hum_avg = sum(r["humidity"] for r in hum_records) / len(hum_records)

#         historical[sensor_id].append({
#             "timestamp": day.strftime("%Y-%m-%dT00:00:00"),
#             "pm25": pm25_avg,
#             # "temperature": temp_avg,
#             # "humidity": hum_avg
#         })

#     return historical



# def generate_24hour_data() -> List[HourlyDataPoint]:
#     sensor_id = "clw9wuxop000bfi7rod4j6ae5"
#     hourlyData = transform_data_from_url(f"https://www.simpleaq.org/api/getgraphdata?id={sensor_id}&field=pm2.5_ug_m3&rangehours=24&time={datetime.now().isoformat()}")
#     print(hourlyData)
#     now = datetime.now()
#     hourly = []
#     for i in range(24):
#         timestamp = (now.replace(minute=0, second=0, microsecond=0) -
#                      timedelta(hours=23 - i))
#         hour = timestamp.hour
#         if (7 <= hour <= 9) or (16 <= hour <= 19):
#             base_pm25 = 30 + random.random() * 15
#         elif hour >= 22 or hour <= 5:
#             base_pm25 = 10 + random.random() * 5
#         else:
#             base_pm25 = 15 + random.random() * 10
#         hourly.append(HourlyDataPoint(
#             time=timestamp,
#             pm25=base_pm25,
#             aqi=calculate_aqi(base_pm25)
#         ))
#     return hourly

def generate_24hour_data(time, field) -> List[HourlyDataPoint]:
    sensor_id = "clw9wuxop000bfi7rod4j6ae5"
    raw = transform_data_from_url(sensor_id, field, time)
    
    # Parse timestamps and values
    records = [
        (datetime.fromisoformat(ts.rstrip("Z")).replace(tzinfo=timezone.utc), float(val))
        for ts, val in zip(raw["time"], raw["value"])
    ]
    
    # Group data by hour
    hourly_data = {}
    for timestamp, value in records:
        hour_key = timestamp.replace(minute=0, second=0, microsecond=0)
        if hour_key not in hourly_data:
            hourly_data[hour_key] = []
        hourly_data[hour_key].append(value)
    
    # Calculate hourly averages
    result = []
    for hour in sorted(hourly_data.keys()):
        values = hourly_data[hour]
        pm25_avg = sum(values) / len(values)
        aqi = calculate_aqi(pm25_avg)
        
        data_point = {
            "time": hour.strftime("%Y-%m-%dT%H:00:00")
        }
        
        if field == "pm2.5_ug_m3":
            data_point.update({
                "pm25": round(pm25_avg, 4),
                "aqi": aqi
            })
        elif field == "temperature_C":
            data_point["temperature"] = round(pm25_avg, 2)
        elif field == "humidity_percent":
            data_point["humidity"] = round(pm25_avg, 2)
            
        result.append(data_point)
    
    return result


def transform_data_from_url(sensor_id, field, time) -> dict:
    # URL encode the time parameter
    encoded_time = time.replace(":", "%3A").replace(".", "%2E")
    url = f"https://www.simpleaq.org/api/getgraphdata?id={sensor_id}&field={field}&rangehours=24&time={encoded_time}"
    response = httpx.get(url)
    response.raise_for_status()  # ensures it throws an error if response code is not 200

    data = response.json()

    # Remove the 'sensor' column
    data.pop("sensor", None)

    return data


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
    # print("Refreshing data...", datetime.now().isoformat())
    raw_data = fetch_pm25_data()
    sensors = generate_sensors(raw_data)
    historical = generate_historical_data(7, 24, 15)
    hourly = generate_24hour_data(datetime.now().isoformat(), "pm2.5_ug_m3")
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
