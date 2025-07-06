const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting Investment Banking CRM...');
console.log(`📍 Port: ${PORT}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);

// Enhanced CORS for production
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://vm-investment-crm.herokuapp.com',
    'https://vm-investment-crm.netlify.app',
    'https://*.herokuapp.com',
    'https://*.netlify.app',
    'https://*.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Security headers
app.use((req, res, next) => {
  res.header('X-Powered-By', 'Investment Banking CRM API');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-Content-Type-Options', 'nosniff');
  if (process.env.NODE_ENV === 'production') {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve static files if available
const fs = require('fs');
const buildPath = path.join(__dirname, 'build');
const distPath = path.join(__dirname, 'dist');

let frontendPath = null;
if (fs.existsSync(buildPath)) {
  frontendPath = buildPath;
  app.use(express.static(buildPath));
  console.log('✅ Serving React build files');
} else if (fs.existsSync(distPath)) {
  frontendPath = distPath;
  app.use(express.static(distPath));
  console.log('✅ Serving Vite dist files');
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    version: '2.0.0',
    port: PORT,
    frontend: frontendPath ? 'available' : 'api-only',
    heroku: !!process.env.DYNO
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: '✅ Investment Banking CRM API is working!',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'production'
  });
});

// Auth Routes
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// In-memory storage for demo
const users = [];

app.post('/api/v1/auth/signup', async (req, res) => {
  try {
    const { email, password, profile = {} } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long',
        code: 'WEAK_PASSWORD'
      });
    }

    const existingUser = users.find(u => u.email === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists',
        code: 'USER_EXISTS'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: Date.now().toString(),
      email: email.toLowerCase(),
      passwordHash,
      profile,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    console.log('✅ User created:', user.email);

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      message: 'Signup failed',
      code: 'SIGNUP_ERROR'
    });
  }
});

app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const user = users.find(u => u.email === email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

app.get('/api/v1/auth/verify', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        message: 'No token provided',
        code: 'MISSING_TOKEN'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    const user = users.find(u => u.id === decoded.id);

    if (!user) {
      return res.status(401).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      message: 'Token verified',
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile
      }
    });
  } catch (error) {
    res.status(401).json({
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
});

// Demo API endpoints
app.get('/api/v1/contacts', (req, res) => {
  res.json({
    contacts: [
      {
        id: 1,
        name: 'John Smith',
        firm: 'Goldman Sachs',
        position: 'Associate',
        group: 'TMT',
        email: 'john.smith@gs.com',
        phone: '+1 (212) 555-0123',
        linkedin: 'https://linkedin.com/in/johnsmith',
        networkingStatus: 'Intro Call Complete',
        networkingDate: '2025-06-15',
        nextSteps: 'Send follow-up email',
        nextStepsDate: '2025-07-10',
        referred: true,
        notes: 'Great conversation about tech deals',
        interactions: [
          {
            id: 1,
            type: 'Call',
            title: 'Initial phone call',
            date: '2025-06-15',
            notes: 'Discussed summer opportunities in TMT'
          }
        ]
      },
      {
        id: 2,
        name: 'Sarah Johnson',
        firm: 'Morgan Stanley',
        position: 'VP',
        group: 'Healthcare',
        email: 'sarah.j@ms.com',
        phone: '+1 (212) 555-0456',
        linkedin: 'https://linkedin.com/in/sarahjohnson',
        networkingStatus: 'Follow-Up Email Sent',
        networkingDate: '2025-06-20',
        nextSteps: 'Schedule coffee chat',
        nextStepsDate: '2025-07-12',
        referred: false,
        notes: 'Senior contact in healthcare banking',
        interactions: []
      }
    ],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 2
    }
  });
});

app.get('/api/v1/interviews', (req, res) => {
  res.json({
    interviews: [
      {
        id: 1,
        firm: 'Goldman Sachs',
        position: 'Investment Banking Analyst',
        group: 'TMT',
        stage: 'Superday',
        stageDate: '2025-07-10',
        nextSteps: 'Send thank you email',
        nextStepsDate: '2025-07-11',
        notes: 'Technical focus on valuation models',
        referralContactId: 1,
        rounds: [
          {
            id: 1,
            stage: 'Phone Screen',
            date: '2025-06-15',
            interviewer: 'Jane Doe',
            format: 'Phone',
            outcome: 'Passed',
            notes: 'Initial screening went well'
          }
        ]
      },
      {
        id: 2,
        firm: 'Morgan Stanley',
        position: 'Investment Banking Analyst',
        group: 'Healthcare',
        stage: 'First Round',
        stageDate: '2025-07-15',
        nextSteps: 'Prepare for next round',
        nextStepsDate: '2025-07-16',
        notes: 'Healthcare sector focus',
        referralContactId: 2,
        rounds: []
      }
    ],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 2
    }
  });
});

app.get('/api/v1/dashboard/stats', (req, res) => {
  res.json({
    stats: {
      totalContacts: 2,
      totalInterviews: 2,
      uniqueFirms: 2,
      referrals: 1,
      successRate: 50,
      referralPercentage: 50,
      applicationSuccessRate: 75
    },
    funnels: {
      networking: [
        { _id: 'Not Yet Contacted', count: 0 },
        { _id: 'Initial Outreach Sent', count: 0 },
        { _id: 'Intro Call Complete', count: 1 },
        { _id: 'Follow-Up Email Sent', count: 1 }
      ],
      interview: [
        { _id: 'Applied', count: 0 },
        { _id: 'Phone Screen', count: 0 },
        { _id: 'First Round', count: 1 },
        { _id: 'Superday', count: 1 }
      ]
    },
    recent: {
      contacts: [
        { id: 1, name: 'John Smith', firm: 'Goldman Sachs', position: 'Associate' },
        { id: 2, name: 'Sarah Johnson', firm: 'Morgan Stanley', position: 'VP' }
      ],
      interviews: [
        { id: 1, firm: 'Goldman Sachs', position: 'Analyst', stage: 'Superday' },
        { id: 2, firm: 'Morgan Stanley', position: 'Analyst', stage: 'First Round' }
      ]
    },
    tasks: {
      upcoming: [
        {
          id: 1,
          type: 'networking',
          category: 'Networking',
          title: 'Send follow-up email',
          subtitle: 'John Smith - Goldman Sachs',
          date: '2025-07-10',
          priority: 'high'
        }
      ],
      followUps: [
        {
          id: 2,
          name: 'Sarah Johnson',
          firm: 'Morgan Stanley',
          position: 'VP',
          daysSinceLastContact: 15
        }
      ]
    }
  });
});

// Root route - Landing page or React app
app.get('/', (req, res) => {
  if (frontendPath) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    // Beautiful landing page
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Investment Banking CRM API</title>
          <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
          <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
              }
              .container {
                  max-width: 900px;
                  margin: 0 auto;
                  padding: 40px 20px;
                  text-align: center;
              }
              .hero {
                  background: rgba(255,255,255,0.1);
                  backdrop-filter: blur(20px);
                  border-radius: 24px;
                  padding: 60px 40px;
                  border: 1px solid rgba(255,255,255,0.2);
                  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              }
              h1 { font-size: 3rem; margin-bottom: 20px; font-weight: 700; }
              .subtitle { font-size: 1.3rem; margin-bottom: 40px; opacity: 0.9; }
              .status { 
                  display: inline-flex; 
                  align-items: center;
                  background: #4CAF50; 
                  color: white; 
                  padding: 12px 24px; 
                  border-radius: 50px; 
                  font-weight: 600;
                  margin-bottom: 40px;
                  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
              }
              .features {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                  gap: 30px;
                  margin: 50px 0;
              }
              .feature {
                  background: rgba(255,255,255,0.1);
                  padding: 30px 20px;
                  border-radius: 16px;
                  border: 1px solid rgba(255,255,255,0.2);
                  transition: transform 0.3s ease;
              }
              .feature:hover { transform: translateY(-5px); }
              .feature i { font-size: 2.5rem; margin-bottom: 15px; color: #81c784; }
              .feature h3 { font-size: 1.2rem; margin-bottom: 10px; }
              .endpoints {
                  background: rgba(255,255,255,0.05);
                  border-radius: 16px;
                  padding: 30px;
                  margin: 40px 0;
                  text-align: left;
              }
              .endpoint { 
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  background: rgba(255,255,255,0.1); 
                  padding: 15px 20px; 
                  margin: 12px 0; 
                  border-radius: 12px;
                  border: 1px solid rgba(255,255,255,0.2);
                  transition: all 0.3s ease;
              }
              .endpoint:hover { 
                  background: rgba(255,255,255,0.2); 
                  transform: translateX(5px);
              }
              .endpoint-info { flex: 1; }
              .method { 
                  font-weight: 700; 
                  color: #81c784; 
                  margin-right: 15px;
                  min-width: 60px;
              }
              .url { color: #fff; text-decoration: none; }
              .test-btn {
                  background: #4CAF50;
                  color: white;
                  border: none;
                  padding: 8px 16px;
                  border-radius: 8px;
                  cursor: pointer;
                  font-size: 0.9rem;
                  transition: all 0.3s ease;
              }
              .test-btn:hover { background: #45a049; transform: scale(1.05); }
              .cta {
                  margin-top: 40px;
              }
              .btn {
                  display: inline-block;
                  background: rgba(255,255,255,0.2);
                  color: white;
                  padding: 15px 30px;
                  border-radius: 12px;
                  text-decoration: none;
                  margin: 10px;
                  border: 1px solid rgba(255,255,255,0.3);
                  transition: all 0.3s ease;
                  font-weight: 600;
              }
              .btn:hover { 
                  background: rgba(255,255,255,0.3); 
                  transform: translateY(-2px);
                  text-decoration: none;
                  color: white;
              }
              .btn-primary { background: #4CAF50; border-color: #4CAF50; }
              .btn-primary:hover { background: #45a049; }
              @media (max-width: 768px) {
                  h1 { font-size: 2.5rem; }
                  .hero { padding: 40px 20px; }
                  .endpoint { flex-direction: column; align-items: flex-start; }
                  .test-btn { margin-top: 10px; }
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="hero">
                  <div class="status">
                      <i class="fas fa-circle" style="margin-right: 8px;"></i>
                      API Online
                  </div>
                  
                  <h1><i class="fas fa-chart-line"></i> Investment Banking CRM</h1>
                  <p class="subtitle">Professional API for Investment Banking Career Management</p>
                  
                  <div class="features">
                      <div class="feature">
                          <i class="fas fa-users"></i>
                          <h3>Contact Management</h3>
                          <p>Track networking contacts and relationships</p>
                      </div>
                      <div class="feature">
                          <i class="fas fa-calendar-check"></i>
                          <h3>Interview Tracking</h3>
                          <p>Monitor application and interview progress</p>
                      </div>
                      <div class="feature">
                          <i class="fas fa-chart-bar"></i>
                          <h3>Analytics Dashboard</h3>
                          <p>Visualize your networking success metrics</p>
                      </div>
                  </div>
                  
                  <div class="endpoints">
                      <h2 style="text-align: center; margin-bottom: 30px;">🔗 API Endpoints</h2>
                      
                      <div class="endpoint">
                          <div class="endpoint-info">
                              <span class="method">GET</span>
                              <a href="/health" class="url">/health</a>
                              <div style="font-size: 0.9rem; opacity: 0.8; margin-top: 4px;">Server health check</div>
                          </div>
                          <button class="test-btn" onclick="testEndpoint('/health')">Test</button>
                      </div>
                      
                      <div class="endpoint">
                          <div class="endpoint-info">
                              <span class="method">GET</span>
                              <a href="/api/v1/contacts" class="url">/api/v1/contacts</a>
                              <div style="font-size: 0.9rem; opacity: 0.8; margin-top: 4px;">Get all contacts (demo data)</div>
                          </div>
                          <button class="test-btn" onclick="testEndpoint('/api/v1/contacts')">Test</button>
                      </div>
                      
                      <div class="endpoint">
                          <div class="endpoint-info">
                              <span class="method">GET</span>
                              <a href="/api/v1/interviews" class="url">/api/v1/interviews</a>
                              <div style="font-size: 0.9rem; opacity: 0.8; margin-top: 4px;">Get all interviews (demo data)</div>
                          </div>
                          <button class="test-btn" onclick="testEndpoint('/api/v1/interviews')">Test</button>
                      </div>
                      
                      <div class="endpoint">
                          <div class="endpoint-info">
                              <span class="method">POST</span>
                              <span class="url">/api/v1/auth/signup</span>
                              <div style="font-size: 0.9rem; opacity: 0.8; margin-top: 4px;">Create user account</div>
                          </div>
                          <button class="test-btn" onclick="testAuth('signup')">Test</button>
                      </div>
                      
                      <div class="endpoint">
                          <div class="endpoint-info">
                              <span class="method">POST</span>
                              <span class="url">/api/v1/auth/login</span>
                              <div style="font-size: 0.9rem; opacity: 0.8; margin-top: 4px;">User authentication</div>
                          </div>
                          <button class="test-btn" onclick="testAuth('login')">Test</button>
                      </div>
                  </div>
                  
                  <div class="cta">
                      <a href="/health" class="btn">📊 Health Check</a>
                      <a href="/api/v1/contacts" class="btn">👥 Demo Contacts</a>
                      <a href="https://github.com/yourusername/investment-banking-crm" class="btn btn-primary">
                          <i class="fab fa-github"></i> View Source
                      </a>
                  </div>
                  
                  <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.2);">
                      <p style="opacity: 0.8;">
                          <i class="fas fa-server"></i> 
                          Powered by Node.js + Express | Deployed on Heroku
                      </p>
                      <p style="opacity: 0.6; font-size: 0.9rem; margin-top: 10px;">
                          Build: ${new Date().toISOString()} | Version: 2.0.0
                      </p>
                  </div>
              </div>
          </div>
          
          <script>
              async function testEndpoint(url) {
                  try {
                      const response = await fetch(url);
                      const data = await response.json();
                      alert('✅ Success!\\n\\n' + JSON.stringify(data, null, 2));
                  } catch (error) {
                      alert('❌ Error: ' + error.message);
                  }
              }
              
              async function testAuth(type) {
                  const email = 'test@example.com';
                  const password = 'password123';
                  
                  try {
                      const response = await fetch('/api/v1/auth/' + type, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email, password, profile: { firstName: 'Test', lastName: 'User' } })
                      });
                      const data = await response.json();
                      
                      if (response.ok) {
                          alert('✅ ' + type.toUpperCase() + ' Success!\\n\\n' + JSON.stringify(data, null, 2));
                      } else {
                          alert('⚠️ ' + data.message);
                      }
                  } catch (error) {
                      alert('❌ Error: ' + error.message);
                  }
              }
          </script>
      </body>
      </html>
    `);
  }
});

// Catch-all for React routes
if (frontendPath) {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    message: 'API endpoint not found',
    requestedUrl: req.originalUrl,
    availableEndpoints: [
      'GET /health',
      'GET /api/v1/contacts',
      'GET /api/v1/interviews',
      'GET /api/v1/dashboard/stats',
      'POST /api/v1/auth/signup',
      'POST /api/v1/auth/login'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error:', error);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('\n🎉 Investment Banking CRM API Started!');
  console.log(`🚀 Server running on port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  if (process.env.DYNO) {
    console.log(`🟣 Heroku dyno: ${process.env.DYNO}`);
  }
  console.log(`📁 Frontend: ${frontendPath ? 'Available' : 'API Landing Page'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => process.exit(0));
});

module.exports = app;
