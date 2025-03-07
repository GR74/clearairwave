
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { sensors } from '@/utils/dummyData';
import { formatPM25 } from '@/utils/aqiUtils';
import { X } from 'lucide-react';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with React
// This is necessary because the webpack bundling process doesn't handle Leaflet's assets correctly
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Create custom colored markers for different AQI levels
const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.7), 0 0 0 5px ${color}30; display: flex; align-items: center; justify-content: center;"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Component to recenter map when needed
const MapCenter = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
};

const AQMap = () => {
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  
  // Center coordinates (approximately Boulder, CO - same as in our dummy data)
  const centerPosition: [number, number] = [40.014984, -105.270546];

  // Get the selected sensor data
  const selectedSensorData = selectedSensor 
    ? sensors.find(s => s.id === selectedSensor) 
    : null;

  return (
    <div className="relative w-full h-full rounded-xl shadow-sm overflow-hidden">
      <MapContainer 
        center={centerPosition} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Center the map on the selected position */}
        <MapCenter center={centerPosition} />
        
        {/* Add markers for each sensor */}
        {sensors.map((sensor) => (
          <Marker
            key={sensor.id}
            position={[sensor.location.lat, sensor.location.lng]}
            icon={createColoredIcon(sensor.aqiCategory?.color || '#4ade80')}
            eventHandlers={{
              click: () => {
                setSelectedSensor(sensor.id);
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
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
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
