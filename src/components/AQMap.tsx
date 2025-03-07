
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { sensors } from '@/utils/dummyData';
import { formatPM25 } from '@/utils/aqiUtils';
import { X, Search, MapPin, Wind } from 'lucide-react';
import L from 'leaflet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Fix for default marker icons in Leaflet with React
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
const MapCenter = ({ center, zoom }: { center: [number, number], zoom?: number }) => {
  const map = useMap();
  map.setView(center, zoom || map.getZoom());
  return null;
};

const AQMap = () => {
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.014984, -105.270546]);
  const [mapZoom, setMapZoom] = useState<number>(13);
  const [filteredSensors, setFilteredSensors] = useState(sensors);
  
  // Handle search functionality
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSensors(sensors);
      return;
    }
    
    const filtered = sensors.filter(sensor => 
      sensor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sensor.location.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setFilteredSensors(filtered);
    
    if (filtered.length > 0) {
      // Center on first match
      setMapCenter([filtered[0].location.lat, filtered[0].location.lng]);
      setMapZoom(15);
    }
  }, [searchQuery]);

  // Get the selected sensor data
  const selectedSensorData = selectedSensor 
    ? sensors.find(s => s.id === selectedSensor) 
    : null;
    
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchQuery.trim() === '') {
      toast("Please enter a search term", {
        description: "Try searching for a sensor name or location"
      });
      return;
    }
    
    if (filteredSensors.length === 0) {
      toast("No results found", {
        description: "Try a different search term"
      });
    } else {
      toast(`Found ${filteredSensors.length} sensors`, {
        description: "Showing results on the map"
      });
    }
  };
    
  // Reset map view
  const resetView = () => {
    setMapCenter([40.014984, -105.270546]);
    setMapZoom(13);
    setSearchQuery('');
    setFilteredSensors(sensors);
    toast("Map view reset", {
      description: "Showing all sensors"
    });
  };

  return (
    <div className="relative w-full h-full rounded-xl shadow-lg overflow-hidden">
      {/* Search overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a sensor or location..."
              className="pl-10 h-11 bg-white/90 backdrop-blur-sm border-white/30 shadow-sm"
            />
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          </div>
          <Button type="submit" className="h-11">Search</Button>
        </form>
        <Button variant="outline" onClick={resetView} className="h-11 bg-white/90 backdrop-blur-sm">
          <MapPin className="mr-2 h-4 w-4" />
          Reset View
        </Button>
      </div>
      
      <MapContainer 
        center={mapCenter} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        className="z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <ZoomControl position="bottomright" />
        
        {/* Center the map on the selected position */}
        <MapCenter center={mapCenter} zoom={mapZoom} />
        
        {/* Add markers for each sensor */}
        {filteredSensors.map((sensor) => (
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
              <div className="p-2">
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
                
                <div className="space-y-1 text-xs mt-2">
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
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wind Speed:</span>
                    <span className="font-medium">{(Math.random() * 20).toFixed(1)} km/h</span>
                  </div>
                </div>
                
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="text-xs text-muted-foreground">
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-3 rounded-lg text-sm z-10 shadow-lg border border-white/20">
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
      
      {/* Weather Forecast Panel */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg z-10 border border-white/20 max-w-[280px] overflow-hidden">
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Weather Forecast</h3>
            <Wind className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="p-3">
          <div className="flex justify-between items-center">
            {[0, 1, 2, 3].map(day => (
              <div key={day} className="flex flex-col items-center">
                <div className="text-xs text-muted-foreground">
                  {new Date(Date.now() + day * 86400000).toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="my-1">
                  {day === 0 && <span className="text-aqi-good">☀️</span>}
                  {day === 1 && <span className="text-aqi-moderate">⛅</span>}
                  {day === 2 && <span className="text-aqi-moderate">🌤️</span>}
                  {day === 3 && <span className="text-aqi-unhealthy">🌧️</span>}
                </div>
                <div className="text-xs font-medium">
                  {Math.round(20 + Math.random() * 5)}°C
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AQMap;
