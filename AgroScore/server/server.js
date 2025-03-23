import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;
const JWT_SECRET = 'your-secret-key'; // In production, use environment variable

// Add CORS configuration before other middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(express.json());
app.use(cookieParser());

// Add security headers
app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3001'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  next();
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ storage: storage });

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Database setup with better error handling
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    createTables();
  }
});

function createTables() {
  db.serialize(() => {
    // Existing user table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT
    )`);

    // New tables for other features
    db.run(`CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      contact TEXT,
      email TEXT,
      lastAssessment TEXT,
      status TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER,
      type TEXT,
      date TEXT,
      status TEXT,
      score INTEGER,
      farmLocation TEXT,
      farmSize TEXT,
      cropType TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(clientId) REFERENCES clients(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      filePath TEXT,
      uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      title TEXT,
      message TEXT,
      isRead INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS settings (
      userId INTEGER PRIMARY KEY,
      notificationPreferences TEXT,
      FOREIGN KEY(userId) REFERENCES users(id)
    )`);

    // Add new tables for farm metrics
    db.run(`CREATE TABLE IF NOT EXISTS farm_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER,
      landQualityScore INTEGER,
      farmSize TEXT,
      topography TEXT,
      accessibilityScore INTEGER,
      droughtRisk TEXT,
      floodRisk TEXT,
      temperatureRisk TEXT,
      rainfallStatus TEXT,
      nutrientLevels TEXT,
      soilPH REAL,
      organicMatter REAL,
      cropSuitability TEXT,
      averageYield REAL,
      yieldTrend TEXT,
      yieldStability TEXT,
      predictedYield REAL,
      lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(clientId) REFERENCES clients(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS credit_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER,
      score INTEGER,
      riskLevel TEXT,
      loanEligibility TEXT,
      lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(clientId) REFERENCES clients(id)
    )`);

    // Add activities table
    db.run(`CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      icon TEXT,
      status TEXT,
      userId INTEGER,
      FOREIGN KEY(userId) REFERENCES users(id)
    )`);

    // Create weather data table
    db.run(`
      CREATE TABLE IF NOT EXISTS weather_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clientId INTEGER NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        temperature REAL,
        humidity INTEGER,
        windSpeed REAL,
        precipitation REAL,
        soilQuality REAL,
        weatherScore REAL,
        soilScore REAL,
        finalScore REAL,
        riskLevel TEXT,
        loanEligibility TEXT,
        measuredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (clientId) REFERENCES users(id)
      )
    `);
  });
}

// Authentication middleware
function authenticateToken(req, res, next) {
  console.log('Checking authentication...');
  console.log('Cookies:', req.cookies);
  
  const token = req.cookies?.token;

  if (!token) {
    console.log('No token found');
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Token verification failed:', err);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    
    console.log('Token verified, user:', user);
    req.user = user;
    next();
  });
}

// Routes
app.post('/api/register', async (req, res) => {
  console.log('Register request received:', req.body);
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Check if user exists
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        console.error('Database error during registration:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (row) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      db.run(
        'INSERT INTO users (email, password) VALUES (?, ?)',
        [email, hashedPassword],
        (err) => {
          if (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({ message: 'Error creating user' });
          }
          console.log('User registered successfully:', email);
          res.status(201).json({ message: 'User registered successfully' });
        }
      );
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  console.log('Login request received:', { email: req.body.email });
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('Database error during login:', err);
        return res.status(500).json({ message: 'Database error' });
      }

      if (!user) {
        console.log('Login failed: User not found:', email);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        console.log('Login failed: Invalid password for user:', email);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Create JWT token with user data
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email 
        }, 
        JWT_SECRET, 
        { expiresIn: '24h' }
      );

      // Set cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        domain: 'localhost',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      console.log('Login successful:', email);
      console.log('Token generated and cookie set');
      console.log('Cookie settings:', {
        token: token.substring(0, 20) + '...',
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        domain: 'localhost'
      });
      
      res.json({ 
        success: true,
        message: 'Logged in successfully',
        user: { email: user.email }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  });
  res.json({ message: 'Logged out successfully' });
});

// Protected route example
app.get('/api/protected', authenticateToken, (req, res) => {
  console.log('Protected route accessed');
  console.log('User from token:', req.user);
  
  if (!req.user || !req.user.email) {
    console.error('No user email in token');
    return res.status(401).json({ message: 'Invalid token' });
  }

  // Return user data from token
  res.json({ 
    message: 'Access granted to protected route', 
    user: {
      email: req.user.email
    }
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running properly' });
});

// Get user details endpoint
app.get('/api/user', authenticateToken, (req, res) => {
  console.log('User details request received');
  console.log('User from token:', req.user);
  
  if (!req.user || !req.user.email) {
    console.error('No user email in token');
    return res.status(401).json({ message: 'Invalid token' });
  }

  const { email } = req.user;
  
  db.get('SELECT email FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (!user) {
      console.error('User not found:', email);
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('Sending user details:', user);
    res.json({ email: user.email });
  });
});

// New routes for client management
app.post('/api/clients', authenticateToken, (req, res) => {
  const { name, contact, email } = req.body;
  
  db.run(
    'INSERT INTO clients (name, contact, email, status) VALUES (?, ?, ?, ?)',
    [name, contact, email, 'active'],
    function(err) {
      if (err) {
        console.error('Error creating client:', err);
        return res.status(500).json({ error: 'Failed to create client' });
      }
      res.json({ id: this.lastID, name, contact, email, status: 'active' });
    }
  );
});

app.get('/api/clients', authenticateToken, (req, res) => {
  db.all('SELECT * FROM clients ORDER BY createdAt DESC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching clients:', err);
      return res.status(500).json({ error: 'Failed to fetch clients' });
    }
    res.json(rows);
  });
});

// Add function to create activity
function createActivity(userId, type, title, description, icon, status = null) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO activities (userId, type, title, description, icon, status) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, type, title, description, icon, status],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// Update assessment creation to add activity
app.post('/api/assessments', authenticateToken, async (req, res) => {
  const { clientName, contactNumber, email, assessmentType } = req.body;
  
  try {
    // First create or find client
    db.get('SELECT id FROM clients WHERE email = ?', [email], async (err, client) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const createAssessment = async (clientId) => {
        return new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO assessments (clientId, type, date, status) VALUES (?, ?, ?, ?)',
            [clientId, assessmentType, new Date().toISOString(), 'pending'],
            async function(err) {
              if (err) reject(err);
              else {
                // Create activity for new assessment
                await createActivity(
                  req.user.userId,
                  'assessment',
                  'New Assessment Created',
                  `Assessment #${this.lastID} created for ${clientName}`,
                  'FileText',
                  'pending'
                );
                resolve(this.lastID);
              }
            }
          );
        });
      };

      if (client) {
        const assessmentId = await createAssessment(client.id);
        res.json({ id: assessmentId, status: 'pending' });
      } else {
        // Create new client first
        db.run(
          'INSERT INTO clients (name, contact, email, status) VALUES (?, ?, ?, ?)',
          [clientName, contactNumber, email, 'active'],
          async function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to create client' });
            }
            // Create activity for new client
            await createActivity(
              req.user.userId,
              'client',
              'New Client Added',
              `Client profile created for ${clientName}`,
              'Users'
            );
            const assessmentId = await createAssessment(this.lastID);
            res.json({ id: assessmentId, status: 'pending' });
          }
        );
      }
    });
  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({ error: 'Failed to create assessment' });
  }
});

app.get('/api/assessments', authenticateToken, (req, res) => {
  db.all(
    `SELECT a.*, c.name as clientName 
     FROM assessments a 
     JOIN clients c ON a.clientId = c.id 
     ORDER BY a.createdAt DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching assessments:', err);
        return res.status(500).json({ error: 'Failed to fetch assessments' });
      }
      res.json(rows);
    }
  );
});

// Generate assessment route
app.post('/api/generate-assessment', authenticateToken, (req, res) => {
  const { location, size, cropType } = req.body;
  
  // In a real application, this would involve complex calculations
  const mockScore = Math.floor(Math.random() * (850 - 650) + 650);
  
  db.run(
    'INSERT INTO assessments (farmLocation, farmSize, cropType, score, status, date) VALUES (?, ?, ?, ?, ?, ?)',
    [location, size, cropType, mockScore, 'completed', new Date().toISOString()],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to generate assessment' });
      }
      res.json({ 
        id: this.lastID,
        score: mockScore,
        status: 'completed'
      });
    }
  );
});

// Search route
app.get('/api/search', authenticateToken, (req, res) => {
  const { query, type } = req.query;
  let sql = '';
  let params = [`%${query}%`];

  switch(type) {
    case 'client':
      sql = 'SELECT * FROM clients WHERE name LIKE ? OR email LIKE ?';
      params.push(`%${query}%`);
      break;
    case 'assessment':
      sql = `SELECT a.*, c.name as clientName 
             FROM assessments a 
             JOIN clients c ON a.clientId = c.id 
             WHERE c.name LIKE ?`;
      break;
    case 'document':
      sql = 'SELECT * FROM documents WHERE name LIKE ? OR description LIKE ?';
      params.push(`%${query}%`);
      break;
    default:
      sql = `
        SELECT 'client' as type, id, name as title, email as description, NULL as date FROM clients WHERE name LIKE ?
        UNION ALL
        SELECT 'assessment' as type, id, type as title, status as description, date FROM assessments WHERE type LIKE ?
        UNION ALL
        SELECT 'document' as type, id, name as title, description, uploadDate as date FROM documents WHERE name LIKE ?
      `;
      params = [`%${query}%`, `%${query}%`, `%${query}%`];
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Search error:', err);
      return res.status(500).json({ error: 'Search failed' });
    }
    res.json(rows);
  });
});

// Update document upload to add activity
app.post('/api/documents/upload', authenticateToken, upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    db.run(
      'INSERT INTO documents (name, description, filePath) VALUES (?, ?, ?)',
      [req.file.originalname, req.body.description || '', req.file.path],
      async function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to save document' });
        }
        // Create activity for document upload
        await createActivity(
          req.user.userId,
          'document',
          'Document Uploaded',
          `Document "${req.file.originalname}" has been uploaded`,
          'FolderOpen'
        );
        res.json({ id: this.lastID, name: req.file.originalname });
      }
    );
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

app.get('/api/documents', authenticateToken, (req, res) => {
  db.all('SELECT * FROM documents ORDER BY uploadDate DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch documents' });
    }
    res.json(rows);
  });
});

// Notification routes
app.get('/api/notifications', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC',
    [req.user.id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch notifications' });
      }
      res.json(rows);
    }
  );
});

app.post('/api/notifications/mark-all-read', authenticateToken, (req, res) => {
  db.run(
    'UPDATE notifications SET isRead = 1 WHERE userId = ?',
    [req.user.id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update notifications' });
      }
      res.json({ success: true });
    }
  );
});

// Settings routes
app.post('/api/settings', authenticateToken, (req, res) => {
  const { notificationPreferences } = req.body;
  
  db.run(
    'INSERT OR REPLACE INTO settings (userId, notificationPreferences) VALUES (?, ?)',
    [req.user.id, JSON.stringify(notificationPreferences)],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to save settings' });
      }
      res.json({ success: true });
    }
  );
});

app.get('/api/settings', authenticateToken, (req, res) => {
  db.get(
    'SELECT notificationPreferences FROM settings WHERE userId = ?',
    [req.user.id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch settings' });
      }
      res.json({
        notificationPreferences: row ? JSON.parse(row.notificationPreferences) : {
          newAssessments: false,
          completedAssessments: false
        }
      });
    }
  );
});

// Add new routes for farm metrics
app.get('/api/farm-metrics/:clientId', authenticateToken, (req, res) => {
  const { clientId } = req.params;
  
  db.get(
    'SELECT * FROM farm_metrics WHERE clientId = ?',
    [clientId],
    (err, metrics) => {
      if (err) {
        console.error('Error fetching farm metrics:', err);
        return res.status(500).json({ error: 'Failed to fetch farm metrics' });
      }
      
      if (!metrics) {
        // Create default metrics if none exist
        const defaultMetrics = {
          landQualityScore: 85,
          farmSize: '150 acres',
          topography: 'Gently Rolling',
          accessibilityScore: 90,
          droughtRisk: 'Low',
          floodRisk: 'Medium',
          temperatureRisk: 'Low',
          rainfallStatus: 'Adequate',
          nutrientLevels: 'Optimal',
          soilPH: 6.8,
          organicMatter: 4.2,
          cropSuitability: 'High',
          averageYield: 4.8,
          yieldTrend: 'Increasing',
          yieldStability: 'High',
          predictedYield: 5.2
        };

        db.run(
          `INSERT INTO farm_metrics (
            clientId, landQualityScore, farmSize, topography, accessibilityScore,
            droughtRisk, floodRisk, temperatureRisk, rainfallStatus,
            nutrientLevels, soilPH, organicMatter, cropSuitability,
            averageYield, yieldTrend, yieldStability, predictedYield
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            clientId,
            defaultMetrics.landQualityScore,
            defaultMetrics.farmSize,
            defaultMetrics.topography,
            defaultMetrics.accessibilityScore,
            defaultMetrics.droughtRisk,
            defaultMetrics.floodRisk,
            defaultMetrics.temperatureRisk,
            defaultMetrics.rainfallStatus,
            defaultMetrics.nutrientLevels,
            defaultMetrics.soilPH,
            defaultMetrics.organicMatter,
            defaultMetrics.cropSuitability,
            defaultMetrics.averageYield,
            defaultMetrics.yieldTrend,
            defaultMetrics.yieldStability,
            defaultMetrics.predictedYield
          ],
          function(err) {
            if (err) {
              console.error('Error creating default farm metrics:', err);
              return res.status(500).json({ error: 'Failed to create farm metrics' });
            }
            res.json({ id: this.lastID, ...defaultMetrics });
          }
        );
      } else {
        res.json(metrics);
      }
    }
  );
});

app.get('/api/credit-score/:clientId', authenticateToken, (req, res) => {
  const { clientId } = req.params;
  
  db.get(
    'SELECT * FROM credit_scores WHERE clientId = ?',
    [clientId],
    (err, score) => {
      if (err) {
        console.error('Error fetching credit score:', err);
        return res.status(500).json({ error: 'Failed to fetch credit score' });
      }
      
      if (!score) {
        // Create default credit score if none exists
        const defaultScore = {
          score: 750,
          riskLevel: 'Low',
          loanEligibility: 'High'
        };

        db.run(
          'INSERT INTO credit_scores (clientId, score, riskLevel, loanEligibility) VALUES (?, ?, ?, ?)',
          [clientId, defaultScore.score, defaultScore.riskLevel, defaultScore.loanEligibility],
          function(err) {
            if (err) {
              console.error('Error creating default credit score:', err);
              return res.status(500).json({ error: 'Failed to create credit score' });
            }
            res.json({ id: this.lastID, ...defaultScore });
          }
        );
      } else {
        res.json(score);
      }
    }
  );
});

// Add activities endpoint
app.get('/api/activities', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM activities WHERE userId = ? ORDER BY timestamp DESC LIMIT 50',
    [req.user.userId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching activities:', err);
        return res.status(500).json({ error: 'Failed to fetch activities' });
      }
      res.json(rows);
    }
  );
});

// Add GIS and soil analysis functions
const calculateSoilScore = (gisData) => {
  const {
    soilType,
    organicMatter,
    pH,
    nitrogen,
    phosphorus,
    potassium,
    drainage,
    erosion,
    slope
  } = gisData;

  // Soil type scoring
  const soilTypeScores = {
    'alluvial': 100,
    'black': 90,
    'red': 80,
    'laterite': 70,
    'sandy': 60,
    'other': 50
  };

  // Calculate individual scores
  const soilTypeScore = soilTypeScores[soilType] || 50;
  const organicMatterScore = Math.min(organicMatter * 10, 100); // Assuming organic matter is in percentage
  const pHScore = 100 - Math.abs(pH - 6.5) * 20; // Optimal pH around 6.5
  const nutrientScore = (
    (nitrogen / 100 * 33) +
    (phosphorus / 100 * 33) +
    (potassium / 100 * 34)
  );
  const drainageScore = drainage === 'good' ? 100 : drainage === 'moderate' ? 70 : 40;
  const erosionScore = erosion === 'low' ? 100 : erosion === 'moderate' ? 60 : 30;
  const slopeScore = Math.max(100 - (slope * 5), 0); // Lower score for steeper slopes

  // Calculate weighted final soil score
  const weights = {
    soilType: 0.2,
    organicMatter: 0.15,
    pH: 0.15,
    nutrients: 0.2,
    drainage: 0.1,
    erosion: 0.1,
    slope: 0.1
  };

  const finalSoilScore = Math.round(
    soilTypeScore * weights.soilType +
    organicMatterScore * weights.organicMatter +
    pHScore * weights.pH +
    nutrientScore * weights.nutrients +
    drainageScore * weights.drainage +
    erosionScore * weights.erosion +
    slopeScore * weights.slope
  );

  return {
    score: finalSoilScore,
    details: {
      soilTypeScore,
      organicMatterScore,
      pHScore,
      nutrientScore,
      drainageScore,
      erosionScore,
      slopeScore
    }
  };
};

// Add GIS data endpoint
app.get('/api/gis-data/:latitude/:longitude', authenticateToken, async (req, res) => {
  const { latitude, longitude } = req.params;
  
  try {
    // Mock GIS data (replace with actual GIS API call)
    const gisData = {
      soilType: 'alluvial',
      organicMatter: 2.5,
      pH: 6.3,
      nitrogen: 80,
      phosphorus: 75,
      potassium: 85,
      drainage: 'good',
      erosion: 'low',
      slope: 2
    };

    const soilAnalysis = calculateSoilScore(gisData);

    res.json({
      gisData,
      soilAnalysis
    });
  } catch (error) {
    console.error('Error fetching GIS data:', error);
    res.status(500).json({ error: 'Failed to fetch GIS data' });
  }
});

// Update credit score calculation to include GIS data
app.post('/api/calculate-credit-score', async (req, res) => {
  const {
    landQuality,
    farmSize,
    cropType,
    loanHistory,
    income,
    marketValue,
    latitude,
    longitude
  } = req.body;

  try {
    // Convert inputs to numbers
    const landQualityScore = parseFloat(landQuality);
    const farmSizeScore = parseFloat(farmSize);
    const loanHistoryScore = parseFloat(loanHistory);
    const annualIncome = parseFloat(income);
    const farmValue = parseFloat(marketValue);

    // Validate inputs
    if (isNaN(landQualityScore) || isNaN(farmSizeScore) || isNaN(loanHistoryScore) || 
        isNaN(annualIncome) || isNaN(farmValue)) {
      return res.status(400).json({ error: 'Invalid input values' });
    }

    // Crop type scoring
    const cropScores = {
      'wheat': 85,
      'rice': 80,
      'cotton': 75,
      'sugarcane': 70,
      'other': 65
    };
    const cropScore = cropScores[cropType] || cropScores.other;

    // Get mock GIS data for soil analysis
    const mockGisData = {
      soilType: 'alluvial',
      organicMatter: 2.5,
      pH: 6.5,
      nitrogen: 80,
      phosphorus: 75,
      potassium: 70,
      drainage: 'good',
      erosion: 'low',
      slope: 2
    };

    // Calculate soil score
    const soilAnalysis = calculateSoilScore(mockGisData);
    const soilScore = soilAnalysis.score;

    // Calculate final credit score
    const weightedScore = (
      landQualityScore * 0.2 +
      farmSizeScore * 0.15 +
      cropScore * 0.15 +
      loanHistoryScore * 0.2 +
      soilScore * 0.3
    );

    // Adjust score based on income and market value
    let finalScore = weightedScore;
    if (annualIncome > 500000) finalScore += 5;
    if (farmValue > 1000000) finalScore += 5;

    // Ensure score is between 0 and 100
    finalScore = Math.max(0, Math.min(100, finalScore));

    res.json({
      creditScore: Math.round(finalScore),
      soilAnalysis: {
        score: soilScore,
        details: mockGisData
      }
    });
  } catch (error) {
    console.error('Error calculating credit score:', error);
    res.status(500).json({ error: 'Failed to calculate credit score' });
  }
});

// Add endpoint to get credit score history
app.get('/api/credit-scores', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM credit_scores WHERE clientId = ? ORDER BY calculatedAt DESC',
    [req.user.userId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching credit scores:', err);
        return res.status(500).json({ error: 'Failed to fetch credit scores' });
      }
      res.json(rows);
    }
  );
});

// Add weather data endpoint
app.post('/api/weather-data', authenticateToken, async (req, res) => {
  const {
    latitude,
    longitude,
    temperature,
    humidity,
    windSpeed,
    precipitation,
    soilQuality,
    weatherScore,
    soilScore,
    finalScore,
    riskLevel,
    loanEligibility
  } = req.body;

  try {
    db.run(
      `INSERT INTO weather_data (
        clientId,
        latitude,
        longitude,
        temperature,
        humidity,
        windSpeed,
        precipitation,
        soilQuality,
        weatherScore,
        soilScore,
        finalScore,
        riskLevel,
        loanEligibility
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.userId,
        latitude,
        longitude,
        temperature,
        humidity,
        windSpeed,
        precipitation,
        soilQuality,
        weatherScore,
        soilScore,
        finalScore,
        riskLevel,
        loanEligibility
      ],
      function(err) {
        if (err) {
          console.error('Error saving weather data:', err);
          return res.status(500).json({ error: 'Failed to save weather data' });
        }
        res.json({ id: this.lastID });
      }
    );
  } catch (error) {
    console.error('Error processing weather data:', error);
    res.status(500).json({ error: 'Failed to process weather data' });
  }
});

// Get weather data history
app.get('/api/weather-data', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM weather_data WHERE clientId = ? ORDER BY measuredAt DESC',
    [req.user.userId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching weather data:', err);
        return res.status(500).json({ error: 'Failed to fetch weather data' });
      }
      res.json(rows);
    }
  );
});

// Add PDF generation endpoint
app.post('/api/generate-credit-report', async (req, res) => {
  try {
    const {
      name,
      landQuality,
      farmSize,
      cropType,
      loanHistory,
      income,
      marketValue,
      latitude,
      longitude
    } = req.body;

    // Create a new PDF document
    const doc = new PDFDocument();
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=credit-report.pdf');
    
    // Pipe the PDF document to the response
    doc.pipe(res);

    // Add content to the PDF
    doc.fontSize(25).text('Credit Score Report', { align: 'center' });
    doc.moveDown();
    
    // Add client information
    doc.fontSize(14).text('Client Information:', { underline: true });
    doc.fontSize(12)
      .text(`Name: ${name}`)
      .text(`Land Quality Score: ${landQuality}`)
      .text(`Farm Size: ${farmSize} acres`)
      .text(`Crop Type: ${cropType}`)
      .text(`Loan History Score: ${loanHistory}`)
      .text(`Annual Income: ₹${income}`)
      .text(`Farm Market Value: ₹${marketValue}`)
      .text(`Location: ${latitude}, ${longitude}`);
    
    doc.moveDown();

    // Add credit score section
    doc.fontSize(14).text('Credit Assessment:', { underline: true });
    
    // Calculate credit score
    const landQualityScore = parseFloat(landQuality);
    const farmSizeScore = parseFloat(farmSize);
    const loanHistoryScore = parseFloat(loanHistory);
    const cropScores = {
      'wheat': 85,
      'rice': 80,
      'cotton': 75,
      'sugarcane': 70,
      'other': 65
    };
    const cropScore = cropScores[cropType] || cropScores.other;
    
    // Calculate final score
    const weightedScore = (
      landQualityScore * 0.2 +
      farmSizeScore * 0.15 +
      cropScore * 0.15 +
      loanHistoryScore * 0.2
    );
    
    const finalScore = Math.min(100, Math.max(0, weightedScore));
    
    // Add risk level and loan eligibility
    let riskLevel, loanEligibility;
    if (finalScore >= 80) {
      riskLevel = 'Low';
      loanEligibility = 'High - Up to ₹50L';
    } else if (finalScore >= 60) {
      riskLevel = 'Medium';
      loanEligibility = 'Medium - Up to ₹25L';
    } else {
      riskLevel = 'High';
      loanEligibility = 'Low - Up to ₹10L';
    }
    
    doc.fontSize(12)
      .text(`Credit Score: ${Math.round(finalScore)}`)
      .text(`Risk Level: ${riskLevel}`)
      .text(`Loan Eligibility: ${loanEligibility}`);
    
    doc.moveDown();
    
    // Add recommendations
    doc.fontSize(14).text('Recommendations:', { underline: true });
    doc.fontSize(12);
    
    if (landQualityScore < 70) {
      doc.text('• Consider soil improvement measures to increase land quality');
    }
    if (loanHistoryScore < 70) {
      doc.text('• Focus on improving loan repayment history');
    }
    if (cropScore < 80) {
      doc.text('• Consider diversifying crop selection for better returns');
    }
    
    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

// Helper function to get color based on score
function getScoreColor(score) {
  if (score >= 750) return '#22C55E'; // Green
  if (score >= 650) return '#F59E0B'; // Yellow
  return '#EF4444'; // Red
}

// Helper function to generate recommendations
function generateRecommendations(score, gisData) {
  const recommendations = [];

  // Credit score based recommendations
  if (score.score < 650) {
    recommendations.push('Consider improving loan history by maintaining consistent payment records');
    recommendations.push('Work on increasing farm productivity to improve income levels');
  }

  // Soil based recommendations
  if (gisData.soilAnalysis.score < 70) {
    recommendations.push('Implement soil improvement practices to enhance soil quality');
    recommendations.push('Consider crop rotation to improve soil health');
  }

  // Financial recommendations
  if (parseInt(score.income) < 500000) {
    recommendations.push('Explore additional income sources or crop diversification');
    recommendations.push('Consider applying for agricultural subsidies');
  }

  return recommendations;
}

// Make sure this is BEFORE app.listen()
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 