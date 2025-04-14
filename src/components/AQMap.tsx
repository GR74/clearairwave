import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { formatPM25 } from '@/utils/aqiUtils';
import { X } from 'lucide-react';
import L from 'leaflet';
import { Skeleton } from '@/components/ui/skeleton';

// Fix for default marker icons in Leaflet with React
(L.Icon.Default.prototype as any)._getIconUrl = undefined;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Create custom colored markers for different AQI levels
const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 42px; opacity: 0.8; height: 42px; border-radius: 50%; box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.7), 0 0 0 5px ${color}30; display: flex; align-items: center; justify-center;"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Function to generate a random offset within ±range
const getRandomOffset = (range: number): number => {
  return (Math.random() * 2 - 1) * range; // Generates a random number between -range and +range
};

// Component to fit bounds to cover all markers
const FitBounds = ({ sensors }: { sensors: any[] }) => {
  const map = useMap();

  useEffect(() => {
    if (sensors.length > 0) {
      // Extract all sensor coordinates
      const bounds = sensors.map((sensor) => [
        sensor.location.lat + getRandomOffset(0.001), // Randomized latitude
        sensor.location.lng + getRandomOffset(0.001), // Randomized longitude
      ]);

      // Fit the map to the bounds
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
    }
  }, [map, sensors]);

  return null;
};

const AQMap = () => {
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [sensors, setSensors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch sensor data periodically
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get("http://localhost:3001/api/sensors");
        setSensors(response.data);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch sensor data'));
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up interval for periodic updates
    const intervalId = setInterval(fetchData, 60000); // Refresh every minute

    return () => clearInterval(intervalId);
  }, []);

  // Get the selected sensor data
  const selectedSensorData = selectedSensor 
    ? sensors.find(s => s.id === selectedSensor) 
    : null;

  if (error) {
    return (
      <div className="relative w-full h-full rounded-xl shadow-sm overflow-hidden flex items-center justify-center">
        <div className="text-center text-red-500">
          <h2 className="text-xl font-semibold">Error loading map data</h2>
          <p className="mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="relative w-full h-full rounded-xl shadow-sm overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-xl shadow-sm overflow-hidden">
      <MapContainer 
        center={[39.9612, -82.9988]} // Default center (will be overridden by FitBounds)
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
        />

        {/* Fit bounds to cover all markers */}
        <FitBounds sensors={sensors} />

        {/* Add markers for each sensor */}
        {sensors.map((sensor) => {
          // Apply random offset to the sensor's position
          const randomizedLat = sensor.location.lat + getRandomOffset(0.001);
          const randomizedLng = sensor.location.lng + getRandomOffset(0.001);
          const position: [number, number] = [randomizedLat, randomizedLng];

          return (
            <Marker
              key={sensor.id}
              position={position}
              icon={createColoredIcon(sensor.aqiCategory?.color || '#4ade80')}
              eventHandlers={{
                click: (e) => {
                  const map = e.target._map; // Access the map instance from the event
                  setSelectedSensor(sensor.id);

                  // Check if the current zoom level is below a threshold (e.g., 12)
                  if (map.getZoom() < 12) {
                    map.flyTo(position, 15, { animate: true, duration: 0.5 }); // Smoothly fly to the marker
                  }

                  // Open the popup programmatically
                  e.target.openPopup();
                },
              }}
            >
              <Popup>
                <div className="p-1">
                  <button 
                    className="absolute top-1 right-1 text-gray-400 hover:text-gray-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSensor(null);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>

                  <div className="font-medium text-sm">{sensor.name}</div>

                  <div 
                    className="text-xs inline-block px-2 py-0.5 rounded-full my-1 font-medium"
                    style={{ 
                      backgroundColor: `${sensor.aqiCategory?.color}20`,
                      color: sensor.aqiCategory?.color
                    }}
                  >
                    {sensor.aqiCategory?.category}
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PM2.5:</span>
                      <span className="font-medium">{formatPM25(sensor.pm25)} µg/m³</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Temperature:</span>
                      <span className="font-medium">{sensor.temperature.toFixed(1)} °C</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Humidity:</span>
                      <span className="font-medium">{sensor.humidity.toFixed(0)}%</span>
                    </div>

                    {/* Add Last Recorded Date and Time */}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span className="font-medium">
                        {new Date(sensor.lastUpdated).toLocaleString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-lg text-sm z-10">
        <div className="flex flex-wrap gap-2 md:gap-4">
          {[
            { label: 'Good', color: '#4ade80' },
            { label: 'Moderate', color: '#facc15' },
            { label: 'Unhealthy', color: '#f87171' },
            { label: 'Hazardous', color: '#ef4444' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AQMap;