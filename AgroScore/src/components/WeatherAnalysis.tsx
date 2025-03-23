import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface WeatherData {
  id: number;
  latitude: number;
  longitude: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  soilQuality: number;
  weatherScore: number;
  soilScore: number;
  finalScore: number;
  riskLevel: string;
  loanEligibility: string;
  measuredAt: string;
}

// Add MapEvents component to handle map clicks
function MapEvents({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) {
  useMapEvents({
    click: onMapClick,
  });
  return null;
}

const WeatherAnalysis: React.FC = () => {
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user's location
  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          setError('Error getting location: ' + error.message);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
    }
  };

  // Fetch weather data
  const fetchWeatherData = async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3001/api/weather-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          // Add other weather data fields here
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const data = await response.json();
      setWeatherData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  // Handle map click
  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    setLocation([lat, lng]);
    fetchWeatherData(lat, lng);
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold text-primary mb-6">Weather Analysis</h2>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={getLocation}
          className="button button-primary mr-4"
        >
          Use My Location
        </button>
        <span className="text-secondary">
          {location ? `Selected location: ${location[0].toFixed(4)}, ${location[1].toFixed(4)}` : 'No location selected'}
        </span>
      </div>

      <div className="map-container">
        <MapContainer
          center={location || [20.5937, 78.9629]} // Default to India center
          zoom={5}
          scrollWheelZoom={true}
        >
          <MapEvents onMapClick={handleMapClick} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {location && <Marker position={location} icon={icon} />}
        </MapContainer>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="spinner"></div>
        </div>
      )}

      {weatherData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Weather Conditions</h3>
            <div className="space-y-2">
              <p>Temperature: {weatherData.temperature}°C</p>
              <p>Humidity: {weatherData.humidity}%</p>
              <p>Wind Speed: {weatherData.windSpeed} km/h</p>
              <p>Precipitation: {weatherData.precipitation} mm</p>
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Analysis Results</h3>
            <div className="space-y-2">
              <p>Weather Score: {weatherData.weatherScore}/100</p>
              <p>Soil Quality: {weatherData.soilQuality}/100</p>
              <p>Final Score: {weatherData.finalScore}/100</p>
              <p>Risk Level: <span className={`px-2 py-1 rounded text-sm ${
                weatherData.riskLevel === 'Low' 
                  ? 'bg-green-100 text-green-800'
                  : weatherData.riskLevel === 'Medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>{weatherData.riskLevel}</span></p>
              <p>Loan Eligibility: {weatherData.loanEligibility}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherAnalysis; 