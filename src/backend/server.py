from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta, date
import random
import math
import time
import asyncio
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
from fastapi import Query
from collections import defaultdict
import uvicorn

from tenacity import (
    retry,
    stop_after_delay,
    wait_exponential,
    retry_if_exception_type,
    stop_after_attempt,
)

#Loading Env Variables
from dotenv import load_dotenv
import os
load_dotenv()

# ----------------------------------------
#Firebase Integration for Real Time Notifications
# ----------------------------------------
import firebase_admin
from firebase_admin import credentials, firestore
import json
import tempfile

firebase_config_json = os.environ["FIREBASE_CREDENTIALS_JSON"]

# Write to a temporary file and use it for credentials
with tempfile.NamedTemporaryFile(mode="w+", delete=False) as temp_cred_file:
    temp_cred_file.write(firebase_config_json)
    temp_cred_file.flush()
    cred = credentials.Certificate(temp_cred_file.name)

# Initialize Firebase app
firebase_admin.initialize_app(cred)
db = firestore.client()



def get_subscriber_emails():
    emails_ref = db.collection("emails")
    docs = emails_ref.stream()
    return [doc.to_dict().get("email") for doc in docs]


# ----------------------------------------
# AQI Utility Functions (from aqiUtils.ts)
# Gowrish lovemen
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




# Adjust these retry parameters as you like
@retry(
    stop=stop_after_attempt(1),              # give up after 30s
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=(
        retry_if_exception_type(httpx.RequestError) |
        retry_if_exception_type(httpx.HTTPStatusError)
    ),
)




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


async def _fetch_chunk_async(
    client: httpx.AsyncClient,
    sensor_id: str,
    api_field: str,
    end_time_iso: str,
    range_hours: int,
) -> Dict[str, Any]:
    """
    Fetch one chunk of data, retrying on network or HTTP errors
    until either success or 30s total elapsed.
    """
    url = (
        f"https://www.simpleaq.org/api/getgraphdata"
        f"?id={sensor_id}"
        f"&field={api_field}"
        f"&rangehours={range_hours}"
        f"&time={end_time_iso}"
    )
    print("url: ", url)
    print("fetch attempt for:", end_time_iso)
    try:
        resp = await client.get(url, timeout=httpx.Timeout(10.0, read=60.0))
        resp.raise_for_status()
    except Exception as e:
        print("  ↳ fetch failed:", repr(e))
        raise
    data = resp.json()
    data.pop("sensor", None)
    # ensure shape
    return {
        "time": data.get("time", []),
        "value": data.get("value", []),
    }




import asyncio
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from typing import List, Dict, Optional, Any


import httpx
from tenacity import retry, stop_after_delay, wait_exponential, retry_if_exception_type


# your existing retry‐decorated fetch_chunk_async here…


async def generate_historical_data(
    sensor_id: str,
    api_field: str,
    time_range: str
) -> List[Dict[str, Optional[float]]]:
    # 1️⃣ configure span
    if time_range == "7d":
        days_to_return = 7
    else:  # "30d" or anything else
        days_to_return = 35


    chunk_days  = 7
    chunk_hours = chunk_days * 24


    # map api_field → output key
    output_key = INVERSE_DATA_VAL_DICT.get(api_field)
    if output_key is None:
        raise ValueError(f"No matching output key for API field: {api_field}")


    # 2️⃣ build list of chunk end‐times
    now = datetime.now(timezone.utc)
    num_chunks = (days_to_return + chunk_days - 1) // chunk_days
    end_times = [
        (now - timedelta(days=i * chunk_days))
        .strftime("%Y-%m-%dT%H:%M:%S.000Z")
        for i in range(num_chunks)
    ]


    # 3️⃣ fetch all chunks in parallel
    async with httpx.AsyncClient() as client:
        tasks = [
            _fetch_chunk_async(client, sensor_id, api_field, et, chunk_hours)
            for et in end_times
        ]
        chunks: List[Dict[str, Any]] = await asyncio.gather(*tasks)


    # 4️⃣ aggregate: raw → hourly buckets → daily buckets
    daily_sum   = defaultdict(float)
    daily_count = defaultdict(int)


    for chunk in chunks:
        # first pass: bucket into hours
        hourly_sum   = defaultdict(float)
        hourly_count = defaultdict(int)


        for ts_str, val_str in zip(chunk["time"], chunk["value"]):
            try:
                dt = datetime.fromisoformat(ts_str.rstrip("Z")).replace(tzinfo=timezone.utc)
                hour_bucket = dt.replace(minute=0, second=0, microsecond=0)
                hourly_sum[hour_bucket]   += float(val_str)
                hourly_count[hour_bucket] += 1
            except Exception:
                continue


        # second pass: collapse each hourly bucket into the day's tally
        for hour_dt, total in hourly_sum.items():
            count = hourly_count[hour_dt]
            if count == 0:
                continue
            hourly_avg = total / count
            day_key = hour_dt.date()
            daily_sum[day_key]   += hourly_avg
            daily_count[day_key] += 1


    # 5️⃣ build the final list, one entry per day (fills in missing days with None)
    result: List[Dict[str, Optional[float]]] = []
    for offset in range(days_to_return - 1, -1, -1):
        day = (now - timedelta(days=offset)).date()
        if daily_count[day]:
            day_avg = round(daily_sum[day] / daily_count[day], 4)
        else:
            day_avg = None


        ts_midnight = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
        result.append({
            "timestamp": ts_midnight.strftime("%Y-%m-%dT00:00:00"),
            output_key: day_avg
        })


    return result




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


    #Add to count to show how many datapoints were collected today
    #Reset Every Day
    if todaysPoints["count"] == date.today():
        todaysPoints["count"] += 1
    else:
        todaysPoints["count"] = 0
        todaysPoints["date"] = date.today()


    global previously_safe_ids
    UNHEALTHY_CATEGORIES = {"Unhealthy", "Very Unhealthy", "Hazardous", "Moderate"} #Moderate is only added for testing purposes
    triggered_sensors = []

    #Detect new unhealthy sensors
    for sensor in sensors:
        if sensor.aqiCategory and sensor.aqiCategory.category in UNHEALTHY_CATEGORIES:
            if sensor.id in previously_safe_ids:
               triggered_sensors.append(sensor)

    if triggered_sensors:
        # Send to PipeDream
        httpx.post(os.getenv("PIPEDREAM_REALTIME"), json={
            "sensors": [
                {"name": s.name, "aqi": s.aqi, "category": s.aqiCategory.category}
                for s in triggered_sensors
                ]
        })
        print(f"🚨 Triggered {len(triggered_sensors)} sensors!")
        for s in triggered_sensors:
            print(f"  ↳ {s.name} is now {s.aqiCategory.category}")

    # Update previously_safe_ids for next check
    previously_safe_ids = {
        sensor.id
        for sensor in sensors
        if sensor.aqiCategory and sensor.aqiCategory.category not in UNHEALTHY_CATEGORIES
    }


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


previously_safe_ids = set()

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
async def get_historical(
    sensor_id: Optional[str] = Query(None),
    metric:    Optional[str] = Query(None),
    time_range: Optional[str] = Query(None),
):
    # default sensor
    if not sensor_id:
        if not DATA["sensors"]:
            return []
        sensor_id = DATA["sensors"][0].id

    # default metric
    if not metric:
        metric = "pm2.5"

    backend_field = DATA_VAL_DICT.get(metric)
    if backend_field is None:
        return []

    # **await** your async function here
    return await generate_historical_data(sensor_id, backend_field, time_range)




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


#Global Counter Variable For Data Points / Day
todaysPoints = {"count": 0, "date": date.today()}

@app.get("/api/counter")
def get_count():
    return todaysPoints



# Track sensors that were healthy in the last refresh
previously_safe_ids = set()

# ----------------------------------------
# Run the Server (Uvicorn)
# ----------------------------------------
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3001)