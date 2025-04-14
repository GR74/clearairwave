/**
 * Air Quality Index (AQI) calculation utilities
 * Based on EPA's AQI calculation method: https://www.airnow.gov/aqi/aqi-basics/
 */

// AQI breakpoints for PM2.5 (in µg/m³)
export const AQI_BREAKPOINTS = [
  { min: 0, max: 12, category: 'Good', color: '#4ade80' },
  { min: 12.1, max: 35.4, category: 'Moderate', color: '#facc15' },
  { min: 35.5, max: 55.4, category: 'Unhealthy for Sensitive Groups', color: '#fb923c' },
  { min: 55.5, max: 150.4, category: 'Unhealthy', color: '#f87171' },
  { min: 150.5, max: 250.4, category: 'Very Unhealthy', color: '#c084fc' },
  { min: 250.5, max: 500, category: 'Hazardous', color: '#ef4444' },
];

// Calculate AQI based on PM2.5 concentration
export const calculateAQI = (pm25: number): number => {
  if (pm25 < 0) return 0;
  
  for (const breakpoint of AQI_BREAKPOINTS) {
    if (pm25 <= breakpoint.max) {
      // Linear interpolation formula
      const lowerAQI = breakpoint === AQI_BREAKPOINTS[0] ? 0 : 
        AQI_BREAKPOINTS.indexOf(breakpoint) * 50;
      const upperAQI = lowerAQI + 50;
      
      const lowerConc = breakpoint.min;
      const upperConc = breakpoint.max;
      
      // AQI formula: ((upperAQI - lowerAQI) / (upperConc - lowerConc)) * (concentration - lowerConc) + lowerAQI
      return Math.round(((upperAQI - lowerAQI) / (upperConc - lowerConc)) * (pm25 - lowerConc) + lowerAQI);
    }
  }
  
  return 500; // Maximum AQI value
};

// Get AQI category based on PM2.5 concentration
export const getAQICategory = (pm25: number): { category: string; color: string } => {
  for (const breakpoint of AQI_BREAKPOINTS) {
    if (pm25 <= breakpoint.max) {
      return { 
        category: breakpoint.category, 
        color: breakpoint.color 
      };
    }
  }
  
  return { 
    category: 'Hazardous', 
    color: '#ef4444' 
  };
};

// Get health recommendations based on AQI category
export const getHealthRecommendations = (category: string): string => {
  switch (category) {
    case 'Good':
      return 'Air quality is satisfactory, and air pollution poses little or no risk.';
    case 'Moderate':
      return 'Air quality is acceptable. However, some pollutants may be a concern for a small number of people who are unusually sensitive to air pollution.';
    case 'Unhealthy for Sensitive Groups':
      return 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.';
    case 'Unhealthy':
      return 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.';
    case 'Very Unhealthy':
      return 'Health alert: The risk of health effects is increased for everyone.';
    case 'Hazardous':
      return 'Health warning of emergency conditions: everyone is more likely to be affected.';
    default:
      return 'Air quality information is currently unavailable.';
  }
};

// Format PM2.5 value for display
export const formatPM25 = (pm25: number): string => {
  return pm25.toFixed(1);
};