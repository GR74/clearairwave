
import React, { useState } from 'react';
import { sensors } from '@/utils/dummyData';
import { formatPM25 } from '@/utils/aqiUtils';
import { X } from 'lucide-react';

const AQMap = () => {
  // We'll create a placeholder map for now - we would use a real map API in production
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  
  const selectedSensorData = selectedSensor 
    ? sensors.find(s => s.id === selectedSensor) 
    : null;

  return (
    <div className="relative w-full h-full rounded-xl shadow-sm overflow-hidden bg-gray-100">
      {/* Placeholder map - would be replaced with Google Maps or Leaflet */}
      <div className="absolute inset-0 bg-blue-50 flex items-center justify-center">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="gray" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Render sensor markers */}
        {sensors.map((sensor) => {
          // Map sensor lat/lng to pixel positions (simplified)
          const x = (sensor.location.lng + 105.28) * 10000 % 100;
          const y = (sensor.location.lat - 40) * 10000 % 100;
          
          return (
            <div 
              key={sensor.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:z-10"
              style={{ 
                left: `${x}%`, 
                top: `${y}%`,
              }}
              onClick={() => setSelectedSensor(sensor.id)}
            >
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-125"
                style={{ 
                  backgroundColor: sensor.aqiCategory?.color,
                  boxShadow: `0 0 0 3px rgba(255, 255, 255, 0.7), 0 0 0 5px ${sensor.aqiCategory?.color}30`
                }}
              >
                <span className="text-white text-xs font-bold">
                  {Math.round(sensor.pm25)}
                </span>
              </div>
            </div>
          );
        })}
        
        {/* Pop-up for selected sensor */}
        {selectedSensorData && (
          <div 
            className="absolute bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 w-64 z-20 transition-all duration-300 animate-fade-in"
            style={{ 
              left: `${(selectedSensorData.location.lng + 105.28) * 10000 % 100}%`, 
              top: `${(selectedSensorData.location.lat - 40) * 10000 % 100}%`,
              transform: 'translate(-50%, calc(-100% - 15px))'
            }}
          >
            <button 
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSensor(null);
              }}
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="mb-2 font-medium">{selectedSensorData.name}</div>
            
            <div 
              className="text-sm inline-block px-2 py-0.5 rounded-full mb-3 font-medium"
              style={{ 
                backgroundColor: `${selectedSensorData.aqiCategory?.color}20`,
                color: selectedSensorData.aqiCategory?.color
              }}
            >
              {selectedSensorData.aqiCategory?.category}
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">PM2.5:</span>
                <span className="font-medium">{formatPM25(selectedSensorData.pm25)} µg/m³</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Temperature:</span>
                <span className="font-medium">{selectedSensorData.temperature.toFixed(1)} °C</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Humidity:</span>
                <span className="font-medium">{selectedSensorData.humidity.toFixed(0)}%</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="font-medium">
                  {new Date(selectedSensorData.lastUpdated).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
            
            <div className="w-3 h-3 bg-white rotate-45 absolute -bottom-1.5 left-1/2 -ml-1.5"></div>
          </div>
        )}
        
        <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-lg text-sm">
          <div className="flex items-center space-x-4">
            {[
              { label: 'Good', color: '#4ade80' },
              { label: 'Moderate', color: '#facc15' },
              { label: 'Unhealthy', color: '#f87171' },
              { label: 'Hazardous', color: '#ef4444' },
            ].map((item) => (
              <div key={item.label} className="flex items-center space-x-1.5">
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
    </div>
  );
};

export default AQMap;
