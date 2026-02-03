import express from 'express';
import { createServer } from 'http';
import { initSocket } from './socket.js';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import { migrate } from './db/migrate.js';
import { pool } from './db/connection.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import conversationRoutes from './routes/conversations.js';
import notificationRoutes from './routes/notifications.js';
import storyRoutes from './routes/stories.js';
import marketplaceRoutes from './routes/marketplace.js';
import companionRoutes from './routes/companionRoutes.js';

dotenv.config();

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

// Get host IP from environment or detect automatically
const HOST = process.env.HOST || '0.0.0.0'; // 0.0.0.0 allows connections from any IP

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Allow localhost and local IP addresses (for development)
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isLocalNetwork = /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin) || 
                          /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin) ||
                          /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/.test(origin);
    
    if (isLocalhost || isLocalNetwork) {
      console.log(`✅ Allowing CORS from: ${origin}`);
      return callback(null, true);
    }
    
    console.log(`❌ Blocked CORS from: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: { error: 'rateLimitError' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // More restrictive for auth to prevent brute force
  message: { error: 'Too many login attempts. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const profileUpdateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Allow 30 profile updates per minute (more than enough for a human)
  message: { error: 'Você está atualizando seu perfil muito rápido. Aguarde um momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const postLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Increased to 20 posts per minute
  message: { error: 'Você está postando muito rápido. Aguarde um momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/users/:username', (req, res, next) => {
  if (req.method === 'PUT') {
    profileUpdateLimiter(req, res, next);
  } else {
    next();
  }
});
app.use('/api/posts', (req, res, next) => {
  if (req.method === 'POST') {
    postLimiter(req, res, next);
  } else {
    next();
  }
});

// Root route
app.get('/api', (req, res) => {
  res.json({
    message: 'Chrono API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      posts: '/api/posts',
      conversations: '/api/conversations',
      notifications: '/api/notifications',
      stories: '/api/stories',
      health: '/health',
    },
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/companions', companionRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('Health check failed:', err);
    res.status(500).json({ 
      status: 'error', 
      db: 'disconnected', 
      error: err.message,
      timestamp: new Date().toISOString() 
    });
  }
});

// Serve static files from the React app
const possibleBuildPaths = [
  path.join(__dirname, 'public'),          // New combined path (server/dist/public)
  path.join(__dirname, '../../dist'),      // Relative to server/dist
  path.join(process.cwd(), 'dist'),        // Current working directory dist
];

// Debug: List files in current directory to help find the build folder
try {
  const files = fs.readdirSync(process.cwd());
  console.log(`Current directory (${process.cwd()}) contents:`, files);
} catch (e) {
  console.error('Failed to list directory contents');
}

let clientBuildPath = possibleBuildPaths[0];
let found = false;

for (const p of possibleBuildPaths) {
  const checkPath = path.join(p, 'index.html');
  if (fs.existsSync(checkPath)) {
    clientBuildPath = p;
    console.log(`✅ SUCCESS: Found index.html at: ${checkPath}`);
    found = true;
    break;
  } else {
    console.log(`Searching for index.html at: ${checkPath} (Not found)`);
  }
}

if (!found) {
  console.error('❌ CRITICAL: Could not find index.html in any of the expected paths.');
}

console.log(`Static files path: ${clientBuildPath}`);
app.use(express.static(clientBuildPath));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  const indexPath = path.join(clientBuildPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`Error sending index.html from ${indexPath}:`, err);
      res.status(500).json({ 
        error: "Frontend build files not found. Please check build command.",
        path: indexPath 
      });
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Initialize Socket.io
initSocket(httpServer, allowedOrigins);

// Run migrations and start server
const startServer = async () => {
  try {
    // START SERVER FIRST to avoid Render timeout "No open ports detected"
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Allowed Origins: ${allowedOrigins.join(', ')}`);
    });

    // Run migrations in the background (idempotent)
    if (process.env.NODE_ENV === 'production') {
       console.log('Starting background migrations...');
       migrate().then(() => {
           console.log('✅ Migrations completed successfully.');
       }).catch(err => {
           console.error('❌ Background migration failed:', err);
           // We don't exit here because the server is already serving
       });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

