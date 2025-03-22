import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart3, 
  Cloud, 
  Leaf, 
  MapPin, 
  ScrollText, 
  Shield, 
  SunMedium,
  Users,
  LogOut,
  User,
  Search,
  Loader2
} from 'lucide-react';

// OpenWeatherMap API configuration
const WEATHER_API_KEY = 'YOUR_API_KEY'; // Replace with your API key
const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5';

interface WeatherData {
  location: string;
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  impact: string;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [searchLocation, setSearchLocation] = useState('');
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchWeatherData = async (location: string) => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await axios.get(`${WEATHER_API_BASE}/weather`, {
        params: {
          q: location,
          appid: WEATHER_API_KEY,
          units: 'metric'
        }
      });

      const impact = calculateWeatherImpact(response.data.main.temp, response.data.main.humidity);
      
      const newWeatherData: WeatherData = {
        location: response.data.name,
        temperature: Math.round(response.data.main.temp),
        description: response.data.weather[0].description,
        humidity: response.data.main.humidity,
        windSpeed: response.data.wind.speed,
        impact
      };

      setWeatherData(prev => [newWeatherData, ...prev].slice(0, 5));
    } catch (err) {
      setError('Location not found. Please try another search.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWeatherImpact = (temperature: number, humidity: number): string => {
    // Simple algorithm to determine agricultural impact
    if (temperature > 35) return '-3.5%';
    if (temperature < 10) return '-2.8%';
    if (humidity > 80) return '-1.2%';
    if (humidity < 30) return '-1.8%';
    return '+2.5%';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchLocation.trim()) {
      fetchWeatherData(searchLocation.trim());
      setSearchLocation('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {showLogin ? (
          <LoginForm 
            onLogin={() => setIsAuthenticated(true)}
            onSwitchToRegister={() => setShowLogin(false)}
          />
        ) : (
          <RegisterForm 
            onRegister={() => setIsAuthenticated(true)}
            onSwitchToLogin={() => setShowLogin(true)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}
      
      {/* Header */}
      <header className="bg-green-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Leaf className="h-8 w-8" />
              <h1 className="text-2xl font-bold">AgroScore</h1>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#" className="hover:text-green-200">Dashboard</a>
              <a href="#" className="hover:text-green-200">Applications</a>
              <a href="#" className="hover:text-green-200">Reports</a>
              <a href="#" className="hover:text-green-200">Settings</a>
              <button 
                onClick={() => setShowProfile(true)}
                className="hover:text-green-200 flex items-center space-x-1"
              >
                <User className="h-5 w-5" />
                <span>Profile</span>
              </button>
              <button 
                onClick={() => setIsAuthenticated(false)}
                className="hover:text-green-200 flex items-center space-x-1"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Users className="h-6 w-6 text-blue-600" />}
            title="Active Applications"
            value="124"
            change="+12%"
          />
          <StatCard
            icon={<BarChart3 className="h-6 w-6 text-green-600" />}
            title="Average Score"
            value="742"
            change="+3.2%"
          />
          <StatCard
            icon={<Shield className="h-6 w-6 text-purple-600" />}
            title="Risk Level"
            value="Low"
            change="Stable"
          />
          <StatCard
            icon={<ScrollText className="h-6 w-6 text-orange-600" />}
            title="Processed Today"
            value="28"
            change="+8"
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Overview */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Geographic Distribution</h2>
              <MapPin className="h-5 w-5 text-gray-500" />
            </div>
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Interactive Map View</p>
            </div>
          </div>

          {/* Weather Widget */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Weather Impact</h2>
              <Cloud className="h-5 w-5 text-gray-500" />
            </div>
            
            {/* Search Form */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search location..."
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                {isLoading && (
                  <Loader2 className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 animate-spin" />
                )}
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </form>

            {/* Weather Cards */}
            <div className="space-y-4">
              {weatherData.map((data, index) => (
                <WeatherCard
                  key={index}
                  icon={data.temperature > 25 ? <SunMedium className="h-5 w-5 text-yellow-500" /> : <Cloud className="h-5 w-5 text-gray-500" />}
                  location={data.location}
                  forecast={`${data.temperature}°C, ${data.description}`}
                  impact={data.impact}
                  details={`Humidity: ${data.humidity}%, Wind: ${data.windSpeed} m/s`}
                />
              ))}
              {weatherData.length === 0 && !isLoading && (
                <div className="text-center text-gray-500 py-4">
                  Search for a location to see weather data
                </div>
              )}
            </div>
          </div>

          {/* Recent Applications */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Applications</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farmer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <ApplicationRow
                    name="John Smith"
                    location="Karnataka"
                    score={785}
                    risk="Low"
                    status="Approved"
                  />
                  <ApplicationRow
                    name="Maria Garcia"
                    location="Punjab"
                    score={692}
                    risk="Medium"
                    status="Pending"
                  />
                  <ApplicationRow
                    name="Raj Patel"
                    location="Gujarat"
                    score={834}
                    risk="Low"
                    status="Approved"
                  />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function LoginForm({ onLogin, onSwitchToRegister }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      <div className="flex items-center justify-center mb-8">
        <Leaf className="h-8 w-8 text-green-600" />
        <h1 className="text-2xl font-bold ml-2">AgroScore</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Sign In
        </button>
      </form>
      <div className="mt-6 text-center">
        <button
          onClick={onSwitchToRegister}
          className="text-sm text-green-600 hover:text-green-500"
        >
          Don't have an account? Register
        </button>
      </div>
    </div>
  );
}

function RegisterForm({ onRegister, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    organization: '',
    role: 'bank'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onRegister();
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      <div className="flex items-center justify-center mb-8">
        <Leaf className="h-8 w-8 text-green-600" />
        <h1 className="text-2xl font-bold ml-2">AgroScore</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <input
            type="text"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Organization</label>
          <input
            type="text"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            value={formData.organization}
            onChange={(e) => setFormData({...formData, organization: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
          >
            <option value="bank">Bank</option>
            <option value="nbfc">NBFC</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Register
        </button>
      </form>
      <div className="mt-6 text-center">
        <button
          onClick={onSwitchToLogin}
          className="text-sm text-green-600 hover:text-green-500"
        >
          Already have an account? Sign in
        </button>
      </div>
    </div>
  );
}

function ProfileModal({ onClose }) {
  const [formData, setFormData] = useState({
    name: 'John Doe',
    email: 'john.doe@bank.com',
    organization: 'State Bank',
    role: 'bank',
    phone: '+91 98765 43210'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Profile Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Organization</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              value={formData.organization}
              onChange={(e) => setFormData({...formData, organization: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            >
              <option value="bank">Bank</option>
              <option value="nbfc">NBFC</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div className="flex space-x-4">
            <button
              type="submit"
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, change }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className={`text-sm ${
          change.includes('+') ? 'text-green-600' : change === 'Stable' ? 'text-gray-600' : 'text-red-600'
        }`}>
          {change}
        </span>
      </div>
      <h3 className="text-gray-500 text-sm">{title}</h3>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function WeatherCard({ icon, location, forecast, impact, details }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          {icon}
          <div>
            <p className="font-medium">{location}</p>
            <p className="text-sm text-gray-500">{forecast}</p>
          </div>
        </div>
        <span className={`text-sm font-medium ${
          impact.includes('+') ? 'text-green-600' : 'text-red-600'
        }`}>
          {impact}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-1">{details}</p>
    </div>
  );
}

function ApplicationRow({ name, location, score, risk, status }) {
  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{name}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{location}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{score}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          risk === 'Low' ? 'bg-green-100 text-green-800' :
          risk === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {risk}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          status === 'Approved' ? 'bg-green-100 text-green-800' :
          status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {status}
        </span>
      </td>
    </tr>
  );
}

export default App;