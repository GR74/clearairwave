from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
import random
import math
import time
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime, timezone
from fastapi import Query
from collections import defaultdict
import uvicorn

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

DATA_VAL_DICT = {
    "pm2.5": "pm2.5_ug_m3",
    "pm10": "pm10.0_ug_m3",
    "pm4": "pm4.0_ug_m3",
    "pm1": "pm1.0_ug_m3",
    "temperature": "temperature_C",
    "humidity": "humidity_percent",
    "pressure": "pressure_hPa",
    "NO2": "NO2_concentration_ppm",
    "O3": "O3_concentration_ppm",
    "SO2": "SO2_concentration_ppm",
}

INVERSE_DATA_VAL_DICT = {v: k for k, v in DATA_VAL_DICT.items()}


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


def fetch_latest_utc_epoch(sensor_id: str) -> int:
    url = f"https://www.simpleaq.org/api/getmostrecentdevicepoint?id={sensor_id}"
    try:
        response = httpx.get(url, timeout=5.0)
        response.raise_for_status()
        data = response.json()
        if data.get("found"):
            dt = datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))
            return int(dt.timestamp() * 1000)
    except Exception as e:
        print("Error fetching latest UTC epoch:", e)
    return int(datetime.now(timezone.utc).timestamp() * 1000)



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
    metric: Optional[float] = None

class HourlyDataPoint(BaseModel):
    time: datetime
    metric: Optional[float] = None



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
        "&min_lat=39.939889&max_lat=40.277507&min_lon=-82.782446&max_lon=-82.195962"
        f"&utc_epoch={int(time.time()) * 1000}"  # static timestamp that worked
        
    )
    try:
        response = httpx.get(url, timeout=10.0)
        response.raise_for_status()
        print("Fetched PM2.5 data")
        # print(url)
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

# def generate_historical_data(days: int = 7, points_per_day: int = 24, baseline_pm25: float = 15) -> List[HistoricalDataPoint]:
#     now = datetime.now()
#     data_points = []
#     for day in range(days):
#         for point in range(points_per_day):
#             timestamp = now - timedelta(days=day)
#             hour = int((24 * point) / points_per_day)
#             timestamp = timestamp.replace(hour=hour, minute=0, second=0, microsecond=0)
            
#             pm25_factor = 1.0
#             if (7 <= hour <= 9) or (16 <= hour <= 19):
#                 pm25_factor = 1.5 + random.random() * 0.5
#             elif hour >= 22 or hour <= 5:
#                 pm25_factor = 0.7 + random.random() * 0.3
            
#             day_of_week = (now.weekday() - day) % 7
#             if day_of_week in (5, 6):
#                 pm25_factor *= 0.85
            
#             random_factor = 0.8 + random.random() * 0.4
#             pm25_value = baseline_pm25 * pm25_factor * random_factor
            
#             temperature = 20 + 10 * math.sin((math.pi * hour) / 12) + random_in_range(-2, 2)
#             humidity = 50 + 15 * math.cos((math.pi * hour) / 12) + random_in_range(-5, 5)
            
#             data_points.append(HistoricalDataPoint(
#                 timestamp=timestamp,
#                 pm25=pm25_value,
#                 temperature=temperature,
#                 humidity=humidity
#             ))
#     # print(data_points)
#     data_points.sort(key=lambda x: x.timestamp)
#     return data_points
    


# def generate_historical_data(sensor_id, field) -> List[Dict]:
#     days = 9
#     # Start at midnight (UTC) `days-1` ago:
#     start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days-1)
#     metric_key = INVERSE_DATA_VAL_DICT.get(field)
#     if metric_key is None:
#         raise ValueError(f"No matching key found in DATA_VAL_DICT for field: {field}")

#     result = []
#     for day_offset in range(days):
#         day = start + timedelta(days=day_offset)
#         # Format the datetime in ISO format with 'Z' suffix
#         formatted_time = day.strftime("%Y-%m-%dT%H:%M:%S.000Z")

#         # 1. PM2.5 daily average via your existing generator
#         pm_records = generate_24hour_data(formatted_time, field, sensor_id)
#         # print(pm_records)

#         valid_values = [r.get(metric_key) for r in pm_records if r.get(metric_key) is not None]
#         print("valid_values: ", valid_values)
#         avg_value = sum(valid_values) / len(valid_values) if valid_values else None
#         print("avg_value: ", avg_value)


#         result.append({
#             "timestamp": day.strftime("%Y-%m-%dT00:00:00"),
#             metric_key : round(avg_value, 4),
#         })

#     return result

def generate_historical_data(sensor_id: str, api_field: str) -> List[Dict[str, Optional[float]]]:
    """
    Generates historical daily average data for a given sensor and API field.
    Fetches raw data in smaller (e.g., 3-day) chunks to avoid server timeouts,
    and then calculates daily averages for the last NUM_DAILY_POINTS_TO_RETURN days.
    """
    NUM_DAILY_POINTS_TO_RETURN = 35  # Number of past daily averages to return
    CHUNK_DURATION_DAYS = 4          # Fetch data in 3-day chunks
    CHUNK_DURATION_HOURS = CHUNK_DURATION_DAYS * 24

    output_metric_key = INVERSE_DATA_VAL_DICT.get(api_field)
    if output_metric_key is None:
        raise ValueError(f"No matching output key found in INVERSE_DATA_VAL_DICT for API field: {api_field}")

    daily_values_sum = defaultdict(float)
    daily_values_count = defaultdict(int)
    
    now_utc = datetime.now(timezone.utc)
    
    # Calculate how many chunks are needed to cover NUM_DAILY_POINTS_TO_RETURN days
    # Add (CHUNK_DURATION_DAYS - 1) to ensure full coverage with integer division
    num_chunks_to_fetch = (NUM_DAILY_POINTS_TO_RETURN + (CHUNK_DURATION_DAYS - 1)) // CHUNK_DURATION_DAYS
    
    # print(f"Attempting to generate {NUM_DAILY_POINTS_TO_RETURN} daily data points for API field '{api_field}'.")
    # print(f"Will fetch in {CHUNK_DURATION_DAYS}-day chunks, requiring approx. {num_chunks_to_fetch} API calls.")

    for chunk_idx in range(num_chunks_to_fetch):
        # Calculate the end_time for this chunk. We fetch backwards from now_utc.
        # chunk_idx = 0: fetches data for the chunk ending now_utc.
        # chunk_idx = 1: fetches data for the chunk ending (now_utc - CHUNK_DURATION_DAYS), etc.
        api_call_end_time = now_utc - timedelta(days=chunk_idx * CHUNK_DURATION_DAYS)
        api_call_end_time_iso = api_call_end_time.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        
        # print(f"  Fetching chunk {chunk_idx + 1}/{num_chunks_to_fetch}, data ending around {api_call_end_time_iso} for field '{api_field}' ({CHUNK_DURATION_HOURS} hours)")
        raw_data_chunk = transform_data_from_url(
            sensor_id, 
            api_field,
            time=api_call_end_time_iso, 
            range_hours=CHUNK_DURATION_HOURS
        )

        chunk_times = raw_data_chunk.get("time", [])
        chunk_values = raw_data_chunk.get("value", [])

        if not (isinstance(chunk_times, list) and isinstance(chunk_values, list)):
            # print(f"  Warning: Expected lists for time/value in chunk {chunk_idx + 1}. Skipping.")
            continue
        
        # print(f"    Fetched {len(chunk_times)} data points in chunk {chunk_idx + 1}.")

        for j in range(min(len(chunk_times), len(chunk_values))):
            ts_str = chunk_times[j]
            value_str = chunk_values[j]
            
            try:
                if not isinstance(ts_str, str) or not isinstance(value_str, (str, int, float)):
                    continue

                dt_object = datetime.fromisoformat(str(ts_str).rstrip("Z")).replace(tzinfo=timezone.utc)
                date_key = dt_object.date() # Group by date
                
                val = float(value_str)
                
                daily_values_sum[date_key] += val
                daily_values_count[date_key] += 1
            except ValueError:
                # print(f"    Skipping data point due to ValueError: ts='{ts_str}', val='{value_str}'")
                pass
            except Exception as e:
                # print(f"    Skipping data point due to error: {e}, ts='{ts_str}', val='{value_str}'")
                pass
        
        # Optional: Add a small delay between API calls if you suspect rate limiting
        # time_module.sleep(0.5) # e.g., 0.5 seconds delay

    print(f"Finished fetching. Aggregated data for {len(daily_values_sum)} unique dates.")

    result_list: List[Dict[str, Optional[float]]] = []
    
    # Generate entries for the last 'NUM_DAILY_POINTS_TO_RETURN' days, ending with today.
    for day_offset in range(NUM_DAILY_POINTS_TO_RETURN - 1, -1, -1): 
        current_report_date = (now_utc - timedelta(days=day_offset)).date()
        
        avg_value_rounded: Optional[float] = None
        if current_report_date in daily_values_count and daily_values_count[current_report_date] > 0:
            avg_value = daily_values_sum[current_report_date] / daily_values_count[current_report_date]
            avg_value_rounded = round(avg_value, 4)
        
        timestamp_dt_obj = datetime(
            current_report_date.year, 
            current_report_date.month, 
            current_report_date.day, 
            0, 0, 0, tzinfo=timezone.utc # Midnight UTC for that day
        )
        timestamp_str = timestamp_dt_obj.strftime("%Y-%m-%dT00:00:00") # Format as requested

        entry: Dict[str, any] = {"timestamp": timestamp_str}
        entry[output_metric_key] = avg_value_rounded
        result_list.append(entry) # type: ignore 
    
    print(f"Generated {len(result_list)} daily average data points.")
    return result_list

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

def generate_24hour_data(time, field, sensor_id) -> List[HourlyDataPoint]:
    raw = transform_data_from_url(sensor_id, field, time, 24)

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
    metric_key = INVERSE_DATA_VAL_DICT.get(field)
    for hour in sorted(hourly_data.keys()):
        values = hourly_data[hour]
        metric_avg = sum(values) / len(values)
        aqi = calculate_aqi(metric_avg)
        
        data_point = {
            "time": hour.strftime("%Y-%m-%dT%H:00:00")
        }
        
        if metric_key:
            data_point[metric_key] = round(metric_avg, 4)

        result.append(data_point)
    
    return result


def transform_data_from_url(sensor_id: str, field: str, time: str, range_hours: int) -> dict:
    url = f"https://www.simpleaq.org/api/getgraphdata?id={sensor_id}&field={field}&rangehours={range_hours}&time={time}"
    timeouts = httpx.Timeout(10.0, read=60.0, write=60.0)
    try:
        response = httpx.get(url, timeout=timeouts)
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPStatusError as e:
        print(f"HTTP error for {url}: {e}")
        return {"time": [], "value": []}
    except httpx.RequestError as e:
        print(f"Request error for {url}: {e}")
        return {"time": [], "value": []}
    except Exception as e:
        print(f"An unexpected error occurred fetching {url}: {e}")
        return {"time": [], "value": []}
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
    raw_data = fetch_pm25_data()
    sensors = generate_sensors(raw_data)
    # # ⚠️ Fix is here: Only generate hourly data for the first available sensor
    if sensors:
        default_sensor_id = sensors[0].id
        hourly = generate_24hour_data(datetime.now().isoformat(), "pm2.5_ug_m3", default_sensor_id)
        # historical = generate_historical_data(default_sensor_id, "pm2.5_ug_m3")
    else:
        hourly = []
        # historical = []

    stats = calculate_statistics(sensors)

    DATA["sensors"] = sensors
    # DATA["historical"] = historical
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

@app.get("/api/refreshtable")
def get_sensors():
    refresh_data()
    return DATA["sensors"]



@app.get("/api/historical")
def get_historical(sensor_id: Optional[str] = Query(None), metric: Optional[str] = Query(None)):
    if not sensor_id:
        if not DATA["sensors"]:
            return []
        sensor_id = DATA["sensors"][0].id
    if not metric:
        metric = "pm2.5"
        
    backend_field = DATA_VAL_DICT.get(metric)
    if backend_field is None:
        return []

    return generate_historical_data(sensor_id, backend_field)




@app.get("/api/hourly")
def get_hourly(sensor_id: Optional[str] = Query(None), metric: Optional[str] = Query(None)):
    now = datetime.now().isoformat()

    if not sensor_id:
        if not DATA["sensors"]:
            return []
        sensor_id = DATA["sensors"][0].id
    if not metric:
        metric = "pm2.5"


    backend_field = DATA_VAL_DICT.get(metric)
    if backend_field is None:
        print(f"[WARNING] Unknown metric: {metric}")
        return []

    print(f"[INFO] Fetching {metric} ({backend_field}) for sensor {sensor_id}")
    return generate_24hour_data(now, backend_field, sensor_id)




@app.get("/api/statistics")
def get_statistics():
    return DATA["statistics"]


# ----------------------------------------
# Run the Server (Uvicorn)
# ----------------------------------------
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3001)
