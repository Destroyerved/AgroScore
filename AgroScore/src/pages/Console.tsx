import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  CloudSun, 
  Leaf, 
  LineChart, 
  LogOut, 
  User,
  Users,
  FileText,
  Search,
  PlusCircle,
  Clock,
  Settings,
  BarChart,
  FolderOpen,
  Bell
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import WeatherAnalysis from '../components/WeatherAnalysis';
import CreditScoreCalculator from '../components/CreditScoreCalculator';

interface MetricCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

function MetricCard({ title, children, className = "" }: MetricCardProps) {
  return (
    <div className={`border rounded-lg p-6 bg-white shadow-lg ${className}`}>
      <h2 className="text-xl font-semibold text-primary mb-4">{title}</h2>
      {children}
    </div>
  );
}

interface Client {
  id: string;
  name: string;
  contact: string;
  email: string;
  lastAssessment: string;
  status: string;
}

interface Assessment {
  id: string;
  clientName: string;
  type: string;
  date: string;
  status: string;
  score: number;
}

interface Document {
  id: string;
  name: string;
  description: string;
  date: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

// Add interface for search results
interface SearchResult {
  type: 'client' | 'assessment' | 'document';
  id: string;
  title: string;
  description: string;
  date?: string;
}

// Add interface for Activity
interface Activity {
  id: string;
  type: 'assessment' | 'client' | 'document';
  title: string;
  description: string;
  timestamp: string;
  icon: 'FileText' | 'Users' | 'FolderOpen';
  status?: string;
}

function Console() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState({
    newAssessments: false,
    completedAssessments: false
  });
  const [farmMetrics, setFarmMetrics] = useState<any>(null);
  const [creditScore, setCreditScore] = useState<any>(null);

  // Form states
  const [newQueryForm, setNewQueryForm] = useState({
    clientName: '',
    contactNumber: '',
    email: '',
    assessmentType: ''
  });

  const [farmData, setFarmData] = useState({
    location: '',
    size: '',
    cropType: ''
  });

  // Add new state for success message
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // Add new state for client form
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    contact: '',
    email: '',
    status: 'active'
  });

  // Add new state for assessment filters
  const [assessmentFilter, setAssessmentFilter] = useState('all');

  // Add new state for credit calculation
  const [creditInputs, setCreditInputs] = useState({
    landQuality: '0',
    farmSize: '0',
    cropType: '',
    loanHistory: '0',
    income: '0',
    marketValue: '0',
    latitude: '',
    longitude: ''
  });

  // Add function to filter assessments
  const filteredAssessments = assessments.filter(assessment => {
    if (assessmentFilter === 'all') return true;
    return assessment.status === assessmentFilter;
  });

  // Add dialog ref
  const addClientDialogRef = useRef<HTMLDialogElement>(null);

  // Update dialog open/close handlers
  const openAddClientDialog = () => {
    addClientDialogRef.current?.showModal();
  };

  const closeAddClientDialog = () => {
    addClientDialogRef.current?.close();
  };

  // Add file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add state for document description
  const [documentDescription, setDocumentDescription] = useState('');

  // Add state for activities
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        console.log('Fetching user details...');
        const response = await fetch('http://localhost:3001/api/protected', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Protected route response:', data);
          if (data.user && data.user.email) {
            setUserEmail(data.user.email);
          } else {
            console.error('No user email in response');
            navigate('/login');
          }
        } else {
          console.error('Failed to fetch user details');
          navigate('/login');
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        navigate('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart className="w-5 h-5" /> },
    { id: 'new-query', label: 'New Query', icon: <PlusCircle className="w-5 h-5" /> },
    { id: 'clients', label: 'Clients', icon: <Users className="w-5 h-5" /> },
    { id: 'assessments', label: 'Assessments', icon: <FileText className="w-5 h-5" /> },
    { id: 'search', label: 'Search Records', icon: <Search className="w-5 h-5" /> },
    { id: 'recent', label: 'Recent Activity', icon: <Clock className="w-5 h-5" /> },
    { id: 'documents', label: 'Documents', icon: <FolderOpen className="w-5 h-5" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  // Handlers
  const handleNewQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    console.log('Submitting new query:', newQueryForm);
    
    try {
      const response = await fetch('http://localhost:3001/api/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newQueryForm)
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok) {
        // Clear form
        setNewQueryForm({
          clientName: '',
          contactNumber: '',
          email: '',
          assessmentType: ''
        });
        
        setSuccessMessage('Query submitted successfully!');
        
        // Refresh assessments list
        fetchAssessments();
        
        // Switch to assessments view after 2 seconds
        setTimeout(() => {
          setActiveSection('assessments');
        }, 2000);
      } else {
        setError(data.error || 'Failed to submit query. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting query:', error);
      setError('Failed to submit query. Please make sure the server is running and try again.');
    }
  };

  const handleGenerateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3001/api/generate-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(farmData)
      });
      
      if (response.ok) {
        // Clear form and show success message
        setFarmData({
          location: '',
          size: '',
          cropType: ''
        });
        console.log('Assessment generated successfully');
      }
    } catch (error) {
      console.error('Error generating assessment:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3001/api/search?query=${encodeURIComponent(searchQuery)}&type=${searchType}`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
        setError('');
      } else {
        setError('Failed to perform search');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching records:', error);
      setError('Failed to perform search. Please try again.');
      setSearchResults([]);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const fileInput = fileInputRef.current;
    if (!fileInput?.files?.length) {
      setError('Please select a file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('document', fileInput.files[0]);
    formData.append('description', documentDescription);

    try {
      const response = await fetch('http://localhost:3001/api/documents/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (response.ok) {
        // Clear form
        fileInput.value = '';
        setDocumentDescription('');
        // Refresh documents list
        fetchDocuments();
        setSuccessMessage('Document uploaded successfully!');
      } else {
        setError('Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Failed to upload document. Please try again.');
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        await fetchNotifications(); // Refresh notifications
        setSuccessMessage('All notifications marked as read');
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      setError('Failed to update notifications');
    }
  };

  const handleSaveSettings = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          notificationPreferences
        })
      });
      
      if (response.ok) {
        console.log('Settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // Data fetching functions
  const fetchDocuments = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/documents', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const docs = await response.json();
        setDocuments(docs);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  // Add function to fetch assessments
  const fetchAssessments = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/assessments', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setAssessments(data);
      }
    } catch (error) {
      console.error('Error fetching assessments:', error);
    }
  };

  // Add handler for adding new client
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3001/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newClientForm)
      });

      if (response.ok) {
        setNewClientForm({
          name: '',
          contact: '',
          email: '',
          status: 'active'
        });
        // Refresh clients list
        fetchClients();
        setSuccessMessage('Client added successfully!');
      }
    } catch (error) {
      console.error('Error adding client:', error);
      setError('Failed to add client');
    }
  };

  // Add function to fetch clients
  const fetchClients = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/clients', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  // Add function to fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/notifications', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Add function to handle single notification
  const handleDismissNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setNotifications(notifications.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  // Add function to fetch activities
  const fetchActivities = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/activities', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  // Update useEffect to include fetchActivities
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [
          clientsRes, 
          assessmentsRes, 
          documentsRes, 
          notificationsRes,
          farmMetricsRes,
          creditScoreRes,
          activitiesRes
        ] = await Promise.all([
          fetch('http://localhost:3001/api/clients', { credentials: 'include' }),
          fetch('http://localhost:3001/api/assessments', { credentials: 'include' }),
          fetch('http://localhost:3001/api/documents', { credentials: 'include' }),
          fetch('http://localhost:3001/api/notifications', { credentials: 'include' }),
          fetch('http://localhost:3001/api/farm-metrics/1', { credentials: 'include' }),
          fetch('http://localhost:3001/api/credit-score/1', { credentials: 'include' }),
          fetch('http://localhost:3001/api/activities', { credentials: 'include' })
        ]);

        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          setClients(clientsData);
        }
        if (assessmentsRes.ok) {
          const assessmentsData = await assessmentsRes.json();
          setAssessments(assessmentsData);
        }
        if (documentsRes.ok) {
          const documentsData = await documentsRes.json();
          setDocuments(documentsData);
        }
        if (notificationsRes.ok) {
          const notificationsData = await notificationsRes.json();
          setNotifications(notificationsData);
        }
        if (farmMetricsRes.ok) {
          const metricsData = await farmMetricsRes.json();
          setFarmMetrics(metricsData);
        }
        if (creditScoreRes.ok) {
          const scoreData = await creditScoreRes.json();
          setCreditScore(scoreData);
        }
        if (activitiesRes.ok) {
          const activitiesData = await activitiesRes.json();
          setActivities(activitiesData);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Add calculation function
  const calculateCreditScore = async () => {
    // Validate inputs
    if (!creditInputs.landQuality || !creditInputs.farmSize || !creditInputs.cropType || 
        !creditInputs.loanHistory || !creditInputs.income || !creditInputs.marketValue) {
      setError('Please fill in all fields');
      return;
    }

    // Validate ranges
    if (parseInt(creditInputs.landQuality) < 0 || parseInt(creditInputs.landQuality) > 100) {
      setError('Land Quality Score must be between 0 and 100');
      return;
    }

    if (parseInt(creditInputs.loanHistory) < 0 || parseInt(creditInputs.loanHistory) > 100) {
      setError('Loan History Score must be between 0 and 100');
      return;
    }

    setError('');
    
    try {
      const response = await fetch('http://localhost:3001/api/calculate-credit-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(creditInputs)
      });

      if (response.ok) {
        const result = await response.json();
        setCreditScore(result);
        setSuccessMessage('Credit score calculated successfully!');
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to calculate credit score');
      }
    } catch (error) {
      console.error('Error calculating credit score:', error);
      setError('Failed to calculate credit score. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-accent-yellow flex items-center justify-center">
        <div className="text-primary text-xl flex items-center">
          <span className="inline-block animate-spin mr-2">⌛</span>
          Loading...
        </div>
      </div>
    );
  }

  if (!userEmail) {
    return null;
  }

  return (
    <div className="min-h-screen bg-accent-yellow flex">
      {/* Sidebar */}
      <div className="w-64 bg-primary text-accent-light min-h-screen">
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-8">
            <Leaf className="h-8 w-8" />
            <span className="text-xl font-bold">AgroScore</span>
          </div>
          
          <div className="space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeSection === item.id 
                    ? 'bg-accent-yellow text-primary' 
                    : 'hover:bg-white/10'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <header className="bg-primary">
          <nav className="container px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <Link to="/" className="flex items-center text-accent-light hover:text-white">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Home
                </Link>
                <h1 className="text-accent-light text-xl font-semibold">
                  {sidebarItems.find(item => item.id === activeSection)?.label}
                </h1>
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center text-accent-light">
                  <User className="h-5 w-5 mr-2" />
                  <span>{userEmail}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center text-accent-light hover:text-white"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </nav>
        </header>

        <main className="container px-6 py-8">
          {activeSection === 'dashboard' && (
            <div className="space-y-8">
              {/* Hero Section with User Info */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-3xl font-bold text-primary">AgroScore Console</h1>
                  <div className="flex items-center bg-accent-yellow px-4 py-2 rounded-lg">
                    <User className="h-6 w-6 text-primary mr-2" />
                    <div>
                      <div className="text-sm text-gray-600">Logged in as</div>
                      <div className="font-semibold text-primary">{userEmail}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* GIS Data */}
                <MetricCard title="GIS Data" className="relative">
                  <div className="flex items-start mb-4">
                    <MapPin className="h-6 w-6 text-primary mr-2 mt-1" />
                    <div>
                      <h3 className="font-semibold text-primary">Land Quality Assessment</h3>
                      <p className="text-gray-600">High-quality agricultural land</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Land Quality Score</span>
                      <span className="font-semibold text-primary">{farmMetrics?.landQualityScore || '-'}/100</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Farm Size</span>
                      <span className="font-semibold text-primary">{farmMetrics?.farmSize || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Topography</span>
                      <span className="font-semibold text-primary">{farmMetrics?.topography || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Accessibility Score</span>
                      <span className="font-semibold text-primary">{farmMetrics?.accessibilityScore || '-'}/100</span>
                    </div>
                  </div>
                </MetricCard>

                {/* Weather Forecasts */}
                <MetricCard title="Weather Risk Analysis">
                  <div className="flex items-start mb-4">
                    <CloudSun className="h-6 w-6 text-primary mr-2 mt-1" />
                    <div>
                      <h3 className="font-semibold text-primary">Weather Risk Analysis</h3>
                      <p className="text-gray-600">30-day forecast and risk assessment</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Drought Risk</span>
                      <span className={`font-semibold ${
                        farmMetrics?.droughtRisk === 'Low' ? 'text-green-600' : 'text-yellow-600'
                      }`}>{farmMetrics?.droughtRisk || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Flood Risk</span>
                      <span className={`font-semibold ${
                        farmMetrics?.floodRisk === 'Low' ? 'text-green-600' : 'text-yellow-600'
                      }`}>{farmMetrics?.floodRisk || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Temperature Extremes</span>
                      <span className={`font-semibold ${
                        farmMetrics?.temperatureRisk === 'Low' ? 'text-green-600' : 'text-yellow-600'
                      }`}>{farmMetrics?.temperatureRisk || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Rainfall Forecast</span>
                      <span className="font-semibold text-primary">{farmMetrics?.rainfallStatus || '-'}</span>
                    </div>
                  </div>
                </MetricCard>

                {/* Soil Health Metrics */}
                <MetricCard title="Soil Analysis">
                  <div className="flex items-start mb-4">
                    <Leaf className="h-6 w-6 text-primary mr-2 mt-1" />
                    <div>
                      <h3 className="font-semibold text-primary">Soil Analysis</h3>
                      <p className="text-gray-600">Comprehensive soil health assessment</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Nutrient Levels</span>
                      <span className="font-semibold text-green-600">{farmMetrics?.nutrientLevels || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Soil pH</span>
                      <span className="font-semibold text-primary">{farmMetrics?.soilPH || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Organic Matter</span>
                      <span className="font-semibold text-primary">{farmMetrics?.organicMatter || '-'}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Crop Suitability</span>
                      <span className="font-semibold text-green-600">{farmMetrics?.cropSuitability || '-'}</span>
                    </div>
                  </div>
                </MetricCard>

                {/* Historical Crop Yields */}
                <MetricCard title="Yield Analysis">
                  <div className="flex items-start mb-4">
                    <LineChart className="h-6 w-6 text-primary mr-2 mt-1" />
                    <div>
                      <h3 className="font-semibold text-primary">Yield Analysis</h3>
                      <p className="text-gray-600">5-year performance trends</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Average Yield</span>
                      <span className="font-semibold text-primary">{farmMetrics?.averageYield || '-'} tons/acre</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Yield Trend</span>
                      <span className="font-semibold text-green-600">{farmMetrics?.yieldTrend || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Yield Stability</span>
                      <span className="font-semibold text-primary">{farmMetrics?.yieldStability || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Predicted Yield</span>
                      <span className="font-semibold text-green-600">{farmMetrics?.predictedYield || '-'} tons/acre</span>
                    </div>
                  </div>
                </MetricCard>
              </div>

              {/* Add Weather Analysis */}
              <WeatherAnalysis />

              {/* Credit Score Summary */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-primary mb-4">Credit Assessment Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-accent-yellow p-4 rounded-lg">
                    <h3 className="font-semibold text-primary">Credit Score</h3>
                    <p className="text-3xl font-bold text-primary">{creditScore?.score || '-'}</p>
                    <p className="text-sm text-gray-600 mt-1">Excellent</p>
                  </div>
                  <div className="bg-accent-yellow p-4 rounded-lg">
                    <h3 className="font-semibold text-primary">Risk Level</h3>
                    <p className="text-3xl font-bold text-green-600">{creditScore?.riskLevel || '-'}</p>
                    <p className="text-sm text-gray-600 mt-1">Based on all metrics</p>
                  </div>
                  <div className="bg-accent-yellow p-4 rounded-lg">
                    <h3 className="font-semibold text-primary">Loan Eligibility</h3>
                    <p className="text-3xl font-bold text-primary">{creditScore?.loanEligibility || '-'}</p>
                    <p className="text-sm text-gray-600 mt-1">Qualified for premium rates</p>
                  </div>
                </div>
              </div>

              {/* Add Credit Score Calculator */}
              <CreditScoreCalculator />
            </div>
          )}

          {activeSection === 'new-query' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-primary mb-6">New Credit Assessment Query</h2>
                
                {successMessage && (
                  <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-6">
                    {successMessage}
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                    {error}
                  </div>
                )}

                <form onSubmit={handleNewQuerySubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-700 mb-2">Client Name</label>
                      <input 
                        type="text" 
                        value={newQueryForm.clientName}
                        onChange={(e) => setNewQueryForm(prev => ({ ...prev, clientName: e.target.value }))}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Enter client name"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-2">Contact Number</label>
                      <input 
                        type="tel" 
                        value={newQueryForm.contactNumber}
                        onChange={(e) => setNewQueryForm(prev => ({ ...prev, contactNumber: e.target.value }))}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Enter contact number"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-2">Email Address</label>
                      <input 
                        type="email" 
                        value={newQueryForm.email}
                        onChange={(e) => setNewQueryForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-2">Assessment Type</label>
                      <select 
                        value={newQueryForm.assessmentType}
                        onChange={(e) => setNewQueryForm(prev => ({ ...prev, assessmentType: e.target.value }))}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                      >
                        <option value="">Select assessment type</option>
                        <option value="new">New Assessment</option>
                        <option value="renewal">Renewal</option>
                        <option value="review">Annual Review</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="mt-6 bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90"
                  >
                    Create New Query
                  </button>
                </form>
              </div>

              {/* Recent Queries Section */}
              <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
                <h3 className="text-xl font-semibold text-primary mb-4">Recent Queries</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Client Name</th>
                        <th className="text-left py-3 px-4">Assessment Type</th>
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessments.slice(0, 5).map((assessment) => (
                        <tr key={assessment.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{assessment.clientName}</td>
                          <td className="py-3 px-4">{assessment.type}</td>
                          <td className="py-3 px-4">{new Date(assessment.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-sm ${
                              assessment.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : assessment.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {assessment.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button 
                              onClick={() => setActiveSection('assessments')}
                              className="text-primary hover:text-opacity-80"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'clients' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-primary">Client Records</h2>
                <button 
                  onClick={openAddClientDialog}
                  className="bg-primary text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Add New Client
                </button>
              </div>

              {/* Add Client Modal */}
              <dialog ref={addClientDialogRef} className="modal p-6 rounded-lg shadow-xl">
                <h3 className="text-xl font-bold text-primary mb-4">Add New Client</h3>
                <form onSubmit={handleAddClient} className="space-y-4">
                  <div>
                    <label className="block text-gray-700 mb-2">Name</label>
                    <input 
                      type="text"
                      value={newClientForm.name}
                      onChange={(e) => setNewClientForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-3 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Contact</label>
                    <input 
                      type="text"
                      value={newClientForm.contact}
                      onChange={(e) => setNewClientForm(prev => ({ ...prev, contact: e.target.value }))}
                      className="w-full p-3 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Email</label>
                    <input 
                      type="email"
                      value={newClientForm.email}
                      onChange={(e) => setNewClientForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full p-3 border rounded-lg"
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button 
                      type="button"
                      onClick={closeAddClientDialog}
                      className="px-4 py-2 border rounded-lg"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="bg-primary text-white px-4 py-2 rounded-lg"
                    >
                      Add Client
                    </button>
                  </div>
                </form>
              </dialog>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Client Name</th>
                      <th className="text-left py-3 px-4">Contact</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-left py-3 px-4">Last Assessment</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr key={client.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{client.name}</td>
                        <td className="py-3 px-4">{client.contact}</td>
                        <td className="py-3 px-4">{client.email}</td>
                        <td className="py-3 px-4">{client.lastAssessment || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-sm ${
                            client.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {client.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button 
                            onClick={() => {
                              // Set client for assessment
                              setNewQueryForm(prev => ({
                                ...prev,
                                clientName: client.name,
                                email: client.email,
                                contactNumber: client.contact
                              }));
                              setActiveSection('new-query');
                            }}
                            className="text-primary hover:text-opacity-80"
                          >
                            New Assessment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSection === 'assessments' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-primary">Credit Assessments</h2>
                  <div className="flex space-x-4">
                    <select 
                      className="p-2 border rounded-lg"
                      value={assessmentFilter}
                      onChange={(e) => setAssessmentFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <button 
                      onClick={() => setActiveSection('new-query')}
                      className="bg-primary text-white px-4 py-2 rounded-lg flex items-center"
                    >
                      <PlusCircle className="w-5 h-5 mr-2" />
                      New Assessment
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Assessment ID</th>
                        <th className="text-left py-3 px-4">Client Name</th>
                        <th className="text-left py-3 px-4">Type</th>
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Score</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssessments.map((assessment) => (
                        <tr key={assessment.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">#{assessment.id.toString().padStart(3, '0')}</td>
                          <td className="py-3 px-4">{assessment.clientName}</td>
                          <td className="py-3 px-4">{assessment.type}</td>
                          <td className="py-3 px-4">{new Date(assessment.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-sm ${
                              assessment.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : assessment.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {assessment.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">{assessment.score || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <button 
                              onClick={() => {
                                // Handle viewing assessment details
                                // This could open a modal or navigate to a details page
                                console.log('View assessment:', assessment.id);
                              }}
                              className="text-primary hover:text-opacity-80"
                            >
                              View Report
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'search' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-primary mb-6">Search Records</h2>
                
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, ID, or keyword"
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <select 
                      value={searchType}
                      onChange={(e) => setSearchType(e.target.value)}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">All Types</option>
                      <option value="assessment">Assessments</option>
                      <option value="client">Clients</option>
                      <option value="document">Documents</option>
                    </select>
                  </div>
                  <div>
                    <button 
                      onClick={handleSearch}
                      className="w-full bg-primary text-white p-3 rounded-lg flex items-center justify-center"
                    >
                      <Search className="w-5 h-5 mr-2" />
                      Search Records
                    </button>
                  </div>
                </div>

                {searchResults.length > 0 ? (
                  <div className="space-y-4">
                    {searchResults.map((result) => (
                      <div 
                        key={`${result.type}-${result.id}`}
                        className="flex items-start p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className={`p-2 rounded-full mr-4 ${
                          result.type === 'assessment' 
                            ? 'bg-green-100' 
                            : result.type === 'client'
                            ? 'bg-blue-100'
                            : 'bg-yellow-100'
                        }`}>
                          {result.type === 'assessment' && <FileText className="w-5 h-5 text-green-600" />}
                          {result.type === 'client' && <Users className="w-5 h-5 text-blue-600" />}
                          {result.type === 'document' && <FolderOpen className="w-5 h-5 text-yellow-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-800">{result.title}</h3>
                            {result.date && (
                              <span className="text-sm text-gray-500">
                                {new Date(result.date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 mt-1">{result.description}</p>
                          <div className="mt-2">
                            <button 
                              onClick={() => {
                                // Navigate to appropriate section based on result type
                                setActiveSection(result.type === 'assessment' ? 'assessments' : 
                                               result.type === 'client' ? 'clients' : 'documents');
                              }}
                              className="text-primary hover:text-opacity-80 text-sm"
                            >
                              View Details →
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-600">
                    No results found for your search
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-600">
                    Enter search criteria to find records
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'recent' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-primary mb-6">Recent Activity</h2>
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div 
                      key={activity.id}
                      className="flex items-start p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className={`p-2 rounded-full mr-4 ${
                        activity.type === 'assessment' 
                          ? 'bg-green-100'
                          : activity.type === 'client'
                          ? 'bg-blue-100'
                          : 'bg-yellow-100'
                      }`}>
                        {activity.icon === 'FileText' && <FileText className={`w-5 h-5 ${
                          activity.type === 'assessment' ? 'text-green-600' : 'text-yellow-600'
                        }`} />}
                        {activity.icon === 'Users' && <Users className="w-5 h-5 text-blue-600" />}
                        {activity.icon === 'FolderOpen' && <FolderOpen className="w-5 h-5 text-yellow-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-800">{activity.title}</p>
                            <p className="text-gray-600">{activity.description}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                          {activity.status && (
                            <span className={`px-2 py-1 rounded text-sm ${
                              activity.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : activity.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {activity.status}
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <button 
                            onClick={() => {
                              // Navigate to the appropriate section based on activity type
                              setActiveSection(activity.type === 'assessment' ? 'assessments' : 
                                             activity.type === 'client' ? 'clients' : 'documents');
                            }}
                            className="text-primary hover:text-opacity-80 text-sm"
                          >
                            View Details →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {activities.length === 0 && (
                    <div className="text-center text-gray-600 py-8">
                      No recent activity to display
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'documents' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-primary">Documents</h2>
                </div>

                {/* Upload Form */}
                <form onSubmit={handleUploadDocument} className="mb-8 p-6 border rounded-lg">
                  <h3 className="text-lg font-semibold text-primary mb-4">Upload New Document</h3>
                  
                  {successMessage && (
                    <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-4">
                      {successMessage}
                    </div>
                  )}
                  
                  {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-700 mb-2">Select File</label>
                      <input 
                        type="file"
                        ref={fileInputRef}
                        className="w-full p-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-2">Description</label>
                      <textarea 
                        value={documentDescription}
                        onChange={(e) => setDocumentDescription(e.target.value)}
                        className="w-full p-3 border rounded-lg"
                        rows={3}
                        placeholder="Enter document description"
                        required
                      />
                    </div>
                    <button 
                      type="submit"
                      className="bg-primary text-white px-6 py-2 rounded-lg flex items-center"
                    >
                      <PlusCircle className="w-5 h-5 mr-2" />
                      Upload Document
                    </button>
                  </div>
                </form>

                {/* Documents Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center mb-3">
                        <FileText className="w-6 h-6 text-primary mr-2" />
                        <span className="font-semibold">{doc.name}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{doc.description}</p>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">
                          Added: {new Date(doc.date).toLocaleDateString()}
                        </span>
                        <button 
                          onClick={() => {
                            // Handle document download
                            console.log('Download document:', doc.id);
                          }}
                          className="text-primary hover:text-opacity-80"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {documents.length === 0 && (
                  <div className="text-center text-gray-600 py-8">
                    No documents uploaded yet
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-primary">Notifications</h2>
                  {notifications.some(n => !n.isRead) && (
                    <button 
                      onClick={handleMarkAllNotificationsRead}
                      className="text-primary hover:text-opacity-80"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {successMessage && (
                  <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-6">
                    {successMessage}
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={`flex items-start p-4 border rounded-lg hover:bg-gray-50 ${
                        !notification.isRead ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="bg-blue-100 p-2 rounded-full mr-4">
                        <Bell className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-800">{notification.title}</p>
                            <p className="text-gray-600">{notification.message}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {new Date(notification.time).toLocaleString()}
                            </p>
                          </div>
                          <button 
                            onClick={() => handleDismissNotification(notification.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <span className="sr-only">Dismiss</span>
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {notifications.length === 0 && (
                    <div className="text-center text-gray-600 py-8">
                      No notifications to display
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-primary mb-6">Settings</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Profile Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-gray-700 mb-2">Name</label>
                        <input 
                          type="text" 
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={userEmail?.split('@')[0] || ''}
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-2">Email</label>
                        <input 
                          type="email" 
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={userEmail || ''}
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Notification Preferences</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={notificationPreferences.newAssessments}
                          onChange={(e) => setNotificationPreferences(prev => ({ ...prev, newAssessments: e.target.checked }))}
                          className="form-checkbox text-primary" 
                        />
                        <span className="ml-2">Email notifications for new assessments</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={notificationPreferences.completedAssessments}
                          onChange={(e) => setNotificationPreferences(prev => ({ ...prev, completedAssessments: e.target.checked }))}
                          className="form-checkbox text-primary" 
                        />
                        <span className="ml-2">Email notifications for completed assessments</span>
                      </label>
                    </div>
                  </div>
                  <div className="pt-6 border-t">
                    <button 
                      onClick={handleSaveSettings}
                      className="bg-primary text-white px-6 py-2 rounded-lg"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Console; 