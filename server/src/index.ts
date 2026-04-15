import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { csrfCookieSetter, csrfProtection, csrfTokenEndpoint } from './middleware/csrf.js';
import { adminRateLimit, adminAuthRateLimit, adminStrictRateLimit } from './middleware/adminRateLimit.js';

// Define __dirname for ES modules FIRST (needed for dotenv path)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root or server .env file IMMEDIATELY
// Try server/.env first, then root/.env
let envPath = path.join(__dirname, '../.env'); // server/.env
if (!fs.existsSync(envPath)) {
  envPath = path.join(__dirname, '../../.env'); // root/.env
}
dotenv.config({ path: envPath });

// NOW import modules that depend on environment variables
import { initializeDatabase } from './db/initializeDatabase.js';
import { runMigrations } from './db/migrations.js';
import { fixLegacyConversationIds } from './db/migrations/fixLegacyConversationIds.js';
import { pool } from './db/connection.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import chatRoutes from './routes/chatRoutes.js';
import reactionsRoutes from './routes/reactions.js';
import notificationRoutes from './routes/notifications.js';
import marketplaceRoutes from './routes/marketplace.js';
import companionRoutes from './routes/companionRoutes.js';
import tagsRoutes from './routes/tags.js';
import userBioRoutes from './routes/userBio.js';
import emailVerificationRouter from './routes/emailVerification.js';
import bookmarkRoutes from './routes/bookmarks.js';
import reportRoutes from './routes/reports.js';
import twoFactorRoutes from './routes/twoFactor.js';
import aiRoutes from './routes/aiRoutes.js';
import adminAuthRoutes from './routes/admin/auth.js';
import adminTagsRoutes from './routes/admin/tags.js';
import adminUsersRoutes from './routes/admin/users.js';
import adminPostsRoutes from './routes/admin/posts.js';
import adminConversationsRoutes from './routes/admin/conversations.js';
import adminVerificationRoutes from './routes/admin/verification.js';
import adminTagsAdminRoutes from './routes/admin/tags-admin.js';
import adminDashboardRoutes from './routes/admin/dashboard.js';
import adminAuditLogRoutes from './routes/admin/auditLog.js';
import { NotificationService } from './services/notificationService.js';
import { scheduleTagUpdates } from './services/tagService.js';
import { scheduleTagUpdateJob } from './jobs/updateUserTags.js';

// ============================================================================
// JWT_SECRET VALIDATION - CRITICAL FOR SECURITY
// ============================================================================
const JWT_SECRET = process.env.JWT_SECRET;

// Helper function for JWT_SECRET validation
function validateJWTSecret(): void {
  // 1. Check if JWT_SECRET is defined
  if (!JWT_SECRET || JWT_SECRET.trim() === '') {
    const errorMsg = 'CRITICAL: JWT_SECRET environment variable is not set or is empty.';
    console.error(`❌ ${errorMsg}`);
    console.error('   Server cannot start without JWT_SECRET.');
    console.error('   Please set JWT_SECRET in your environment variables.');
    console.error('   For Railway: Add JWT_SECRET variable in Variables section.');
    console.error('   For local: Set JWT_SECRET in server/.env file.');
    throw new Error(errorMsg);
  }

  // 2. Check minimum length (32 characters = 128 bits of entropy)
  if (JWT_SECRET.length < 32) {
    const errorMsg = `CRITICAL: JWT_SECRET is too short (${JWT_SECRET.length} chars). Minimum 32 characters required.`;
    console.error(`❌ ${errorMsg}`);
    console.error('   Recommended: Use a 64+ character random secret.');
    console.error('   Generate with: openssl rand -hex 32');
    throw new Error(errorMsg);
  }

  // 3. Check for obvious default/insecure values
  const insecureValues = [
    'your-super-secret-jwt-key-change-this-in-production-12345',
    'secret',
    'test',
    'password',
    'jwt_secret',
    'demo'
  ];
  
  if (insecureValues.some(val => JWT_SECRET.toLowerCase() === val.toLowerCase())) {
    const errorMsg = 'CRITICAL: JWT_SECRET is using an insecure default value.';
    console.error(`❌ ${errorMsg}`);
    console.error('   Change it to a strong, random secret immediately.');
    throw new Error(errorMsg);
  }

  // 4. Log success with safe mask
  const maskedSecret = JWT_SECRET.substring(0, 8) + '...' + JWT_SECRET.substring(JWT_SECRET.length - 4);
  console.log(`✅ JWT_SECRET validated (length: ${JWT_SECRET.length}, sample: ${maskedSecret})`);
}

// Execute validation
validateJWTSecret();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// MNT-06: Require CORS_ORIGIN in production — wildcard fallback is insecure
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  console.error('CRITICAL: CORS_ORIGIN must be set in production. Refusing to start.');
  process.exit(1);
}

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

// Get host IP from environment or detect automatically
const HOST = process.env.HOST || '0.0.0.0'; // 0.0.0.0 allows connections from any IP

// Security Headers - Helmet MUST be before CORS
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        "wss:", "ws:",
        "https://hcaptcha.com", "https://*.hcaptcha.com",
      ],
      imgSrc: [
        "'self'", "data:", "blob:",
        "https://i.imgur.com",
        "https://images.unsplash.com",
        "https://placehold.co",
        "https://*.hcaptcha.com",
      ],
      scriptSrc: [
        "'self'",
        // Tailwind CDN — no PostCSS integration in this project, CDN is the styling mechanism
        "https://cdn.tailwindcss.com",
        // hCaptcha
        "https://js.hcaptcha.com", "https://hcaptcha.com",
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["'self'", "https://hcaptcha.com", "https://newassets.hcaptcha.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Allow Render and Railway domains and subdomains
    if (origin.endsWith('.onrender.com') || origin.endsWith('.railway.app')) {
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
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// CSRF Protection (Double Submit Cookie)
app.use(csrfCookieSetter);  // Sets csrf_token cookie on every response
app.get('/api/auth/csrf-token', csrfTokenEndpoint);  // Endpoint to fetch CSRF token
app.use('/api', csrfProtection);  // Validates CSRF on mutation requests (POST/PUT/DELETE/PATCH)

// Socket.io Setup - com CORS agressivo para desenvolvimento
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Permitir todos em desenvolvimento, ser específico em produção
      if (process.env.NODE_ENV === 'production') {
        if (allowedOrigins.includes(origin || '') || 
            (origin && (origin.endsWith('.railway.app') || origin.endsWith('.onrender.com')))) {
          callback(null, true);
        } else {
          callback(new Error('CORS error'));
        }
      } else {
        // Desenvolvimento: permitir tudo
        callback(null, true);
      }
    },
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ['websocket', 'polling'],
  serveClient: true,
});

app.set('io', io);
app.set('trust proxy', 1); // Trust Railway's proxy for X-Forwarded-For header

// Socket.io authentication middleware
io.use((socket, next) => {
  console.log('[🔌 Socket.io Middleware] 🔍 Tentativa de conexão recebida:', {
    id: socket.id,
    handshake: socket.handshake?.url || 'unknown',
  });

  try {
    // Extract token: 1) handshake auth (legacy), 2) httpOnly cookie
    let token = socket.handshake.auth.token;
    
    if (!token) {
      // Parse token from httpOnly cookie in upgrade request headers
      const cookieHeader = socket.handshake.headers.cookie;
      if (cookieHeader) {
        const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
        if (match) {
          token = match[1];
        }
      }
    }
    
    if (!token) {
      console.error('[🔌 Socket.io Middleware] ❌ Nenhum token fornecido');
      return next(new Error('Authentication error: token required'));
    }
    
    // Verify JWT
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        console.error('[🔌 Socket.io Middleware] ❌ Token inválido:', err.message);
        return next(new Error('Authentication error: invalid token'));
      }
      
      // Store user info on socket for later use
      socket.data.userId = user.id;
      socket.data.username = user.username;
      
      console.log('[🔌 Socket.io Middleware] ✅ Token verificado para usuário:', user.username);
      next();
    });
  } catch (error) {
    console.error('[🔌 Socket.io Middleware] 💥 Erro inesperado:', error);
    return next(new Error('Authentication error: unexpected error'));
  }
});


// Eventos de erro de conexão (antes de autenticação)
io.on('connect_error', (error: any) => {
  console.error('[🔌 Socket.io] 🚨 Erro de conexão (pré-autenticação):', {
    message: error?.message,
    code: error?.code,
    type: error?.type,
  });
});

// ========== PRESENCE TRACKING (C-07) ==========
// In-memory set of online user IDs (will reset on server restart)
// For production, use Redis or a database
const onlineUsers = new Set<string>();

io.on('connection', (socket) => {
  console.log(`✅ [Socket.io] User ${socket.data.userId} (${socket.data.username}) connected. Total: ${io.engine.clientsCount}`);

  // ========== PRESENCE: Announce user as online (C-07) ==========
  if (socket.data.userId) {
    onlineUsers.add(String(socket.data.userId));
    // Broadcast to all clients: this user is now online
    io.emit('user:online', { 
      userId: socket.data.userId, 
      username: socket.data.username,
      timestamp: new Date().toISOString()
    });
  }

  // ✅ Teste de conexão - servidor envia ping
  socket.emit('ping_from_server', { message: 'Server is live', timestamp: new Date().toISOString() });
  
  socket.on('pong_from_client', () => {
    // Pong received
  });

  socket.on('join_conversation', async (conversationId) => {
    try {
      // Verify user is a participant in this conversation
      const result = await pool.query(
        `SELECT id FROM conversations 
         WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
        [conversationId, socket.data.userId]
      );

      if (result.rows.length === 0) {
        socket.emit('error', { code: 'ACCESS_DENIED', message: 'Not a participant in this conversation' });
        return;
      }

      socket.join(conversationId);
      console.log(`✅ User ${socket.data.userId} joined conversation ${conversationId}`);
    } catch (error: any) {
      console.error('Error in join_conversation:', error.message);
      socket.emit('error', { code: 'ERROR', message: 'Failed to join conversation' });
    }
  });

  socket.on('leave_conversation', (conversationId) => {
    socket.leave(conversationId);
    console.log(`User ${socket.data.userId} left conversation ${conversationId}`);
  });

  socket.on('disconnect', () => {
    // ========== PRESENCE: Announce user as offline (C-07) ==========
    if (socket.data.userId) {
      onlineUsers.delete(String(socket.data.userId));
      // Broadcast to all clients: this user is now offline
      io.emit('user:offline', { 
        userId: socket.data.userId, 
        username: socket.data.username,
        timestamp: new Date().toISOString()
      });
    }
  });
});

// Rate Limiting - Custom key generator for Railway (handles X-Forwarded-For safely)
const getClientIp = (req: any) => {
  // For Railway/Render with trust proxy enabled
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  // Fallback to direct connection
  return req.socket.remoteAddress || req.connection.remoteAddress || 'unknown';
};

// QC-04: Sane rate limits — prevent abuse without blocking legitimate users
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 120,             // ~2 req/s average per IP
  message: { error: 'Too many requests. Please try again later.' },
  keyGenerator: getClientIp,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per 15 min — brute force protection
  message: { error: 'Too many login attempts. Please try again later.' },
  keyGenerator: getClientIp,
  standardHeaders: true,
  legacyHeaders: false,
});

const profileUpdateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Você está atualizando seu perfil muito rápido. Aguarde um momento.' },
  keyGenerator: getClientIp,
  standardHeaders: true,
  legacyHeaders: false,
});

const postLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15,             // 15 posts/min is generous for real use
  message: { error: 'Você está postando muito rápido. Aguarde um momento.' },
  keyGenerator: getClientIp,
  standardHeaders: true,
  legacyHeaders: false,
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,             // 1 message/s average — GET (polling) is not counted
  message: { error: 'Você está enviando muitas mensagens. Aguarde um momento.' },
  keyGenerator: getClientIp,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/users/:username', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.method === 'PUT') {
    profileUpdateLimiter(req, res, next);
  } else {
    next();
  }
});
app.use('/api/posts', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.method === 'POST') {
    postLimiter(req, res, next);
  } else {
    next();
  }
});
app.use('/api/chat', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.method === 'POST') {
    chatLimiter(req, res, next);
  } else {
    next();
  }
});

// Root route
app.get('/api', (_req: express.Request, res: express.Response) => {
  res.json({
    message: 'Chrono API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      posts: '/api/posts',
      chat: '/api/chat',
      notifications: '/api/notifications',
      health: '/health',
    },
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/email-verification', emailVerificationRouter);
app.use('/api/users', userRoutes);
app.use('/api/bio', userBioRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/posts', reactionsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/auth/2fa', twoFactorRoutes);
app.use('/api/ai', aiRoutes);

// 🔐 ADMIN ROUTES - Apply rate limiting to all admin endpoints
// Authentication is handled by requireAdmin middleware in each route
app.use('/api/admin/auth', adminAuthRateLimit, adminAuthRoutes);
app.use('/api/admin/tags', adminRateLimit, adminTagsRoutes);
app.use('/api/admin/users', adminRateLimit, adminUsersRoutes);
app.use('/api/admin/posts', adminRateLimit, adminPostsRoutes);
app.use('/api/admin/conversations', adminRateLimit, adminConversationsRoutes);
app.use('/api/admin/verification', adminRateLimit, adminVerificationRoutes);
app.use('/api/admin/tags-admin', adminStrictRateLimit, adminTagsAdminRoutes);
app.use('/api/admin/dashboard', adminRateLimit, adminDashboardRoutes);
app.use('/api/admin/audit-log', adminRateLimit, adminAuditLogRoutes);

// Health check
app.get('/health', async (_req: express.Request, res: express.Response) => {
  try {
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const postCount = await pool.query('SELECT COUNT(*) FROM posts');
    res.json({ 
      status: 'ok', 
      db: 'connected', 
      stats: {
        users: parseInt(userCount.rows[0].count),
        posts: parseInt(postCount.rows[0].count)
      },
      timestamp: new Date().toISOString() 
    });
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
  path.resolve(__dirname, '../dist/public'),   // server/dist/public (after TypeScript compilation)
  path.resolve(__dirname, '../../dist'),       // Root dist
  path.resolve(__dirname, '../../server/dist/public'), // Alternative path
  path.resolve(process.cwd(), 'server/dist/public'), // Root to server/dist/public  
];

// Debug information
console.log('--- Path Debug ---');
console.log(`CWD: ${process.cwd()}`);
console.log(`__dirname: ${__dirname}`);

let clientBuildPath = '';
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
  // Fallback to a safe directory to avoid crashing, but we'll return 404/500 later
  clientBuildPath = path.resolve(process.cwd(), 'dist');
}

console.log(`Final Static files path: ${clientBuildPath}`);
console.log('------------------');

// Middleware for logging static file requests
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.url.startsWith('/assets/') || req.url.endsWith('.js') || req.url.endsWith('.css')) {
    const filePath = path.join(clientBuildPath, req.url);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Static file NOT FOUND: ${filePath}`);
      // Don't send 500 here, let express.static try to handle it or fall through
    }
  }
  next();
});

// Explicitly serve assets folder with long cache
app.use('/assets', express.static(path.join(clientBuildPath, 'assets'), {
  maxAge: '1y',
  immutable: true
}));

app.use(express.static(clientBuildPath));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req: express.Request, res: express.Response) => {
  // Skip API routes
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }

  const indexPath = path.join(clientBuildPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error(`❌ Cannot send index.html, file does not exist at: ${indexPath}`);
    res.status(500).send(`
      <html>
        <body style="background: #000; color: #0f0; font-family: monospace; padding: 20px; line-height: 1.6;">
          <h1 style="color: #f0f; border-bottom: 2px solid #f0f; padding-bottom: 10px;">❌ CHRONO_SYSTEM_FAILURE</h1>
          <div style="background: #111; padding: 15px; border: 1px solid #333; margin: 20px 0;">
            <p><strong>Status:</strong> CRITICAL_ASSETS_MISSING</p>
            <p><strong>Missing File:</strong> <code style="color: #fff;">${indexPath}</code></p>
          </div>
          <p>This usually means the frontend build failed or the files were not copied to the server directory.</p>
          <p><strong>Troubleshooting:</strong></p>
          <ul>
            <li>Check Render build logs for errors during <code>vite build</code>.</li>
            <li>Verify <code>copy-assets.js</code> execution logs.</li>
            <li>Ensure "Root Directory" in Render settings is empty.</li>
          </ul>
          <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;">
          <p style="font-size: 0.8em; color: #666;">
            CWD: ${process.cwd()}<br>
            __dirname: ${__dirname}<br>
            NODE_ENV: ${process.env.NODE_ENV}
          </p>
        </body>
      </html>
    `);
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Run migrations and start server
const startServer = async () => {
  try {
    // START SERVER FIRST to avoid Render timeout "No open ports detected"
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Allowed Origins: ${allowedOrigins.join(', ')}`);
    });

    // Initialize database schema with proper error handling
    console.log('📦 Inicializando schema do banco de dados...');
    try {
      await initializeDatabase();
      console.log('✅ Schema inicializado com sucesso.');
    } catch (err: any) {
      console.error('⚠️  Erro ao inicializar schema:', err.message);
      // Don't stop server, migration might still work
    }

    // Run SQL migrations (idempotent — tracked in schema_migrations table)
    console.log('Running database migrations...');
    try {
      await runMigrations();
      console.log('Database migrations complete.');
      
      // Check for and warn about legacy conversation IDs
      await fixLegacyConversationIds();
    } catch (err: any) {
      console.error('Migration error:', err.message);
    }

    try {
      const notifSvc = new NotificationService();
      notifSvc.startQueueWorker();
      
      // Initialize Email Service for email verification
      console.log('📧 Inicializando serviço de email...');
      try {
        const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
        const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
        const hasGmailCredentials = gmailUser && gmailPass;
        
        if (hasGmailCredentials) {
          // Use real Gmail service
          const { initializeEmailService } = await import('./services/emailService.js');
          const emailService = initializeEmailService({
            gmailUser: gmailUser!,
            gmailAppPassword: gmailPass!,
            frontendUrl: process.env.FRONTEND_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:3000'),
            fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@chrono.com',
            fromName: process.env.SMTP_FROM_NAME || 'Chrono'
          });
          
          // Test email connection
          const emailConnected = await emailService.testConnection();
          if (!emailConnected) {
            console.warn('⚠️  Email service not configured or credentials invalid. Falling back to mock service.');
            // Initialize mock service as fallback
            const { initializeMockEmailService } = await import('./services/mockEmailService.js');
            initializeMockEmailService();
          }
        } else {
          // No credentials provided, use mock service
          console.log('📧 Gmail credentials não configuradas. Usando MockEmailService para testes.');
          const { initializeMockEmailService } = await import('./services/mockEmailService.js');
          initializeMockEmailService();
        }
      } catch (emailErr: any) {
        console.warn('⚠️  Email service initialization failed:', emailErr.message);
        console.log('📧 Usando MockEmailService como fallback...');
        try {
          const { initializeMockEmailService } = await import('./services/mockEmailService.js');
          initializeMockEmailService();
        } catch (mockErr: any) {
          console.error('❌ Mock email service também falhou:', mockErr.message);
        }
      }
      
      // Initialize automatic tag updates (every 6 hours)
      console.log('🏷️  Iniciando scheduler de atualização de tags...');
      scheduleTagUpdates();
      
      // Initialize automatic user bio tags update (daily at 3 AM)
      console.log('🏷️  Iniciando scheduler de tags de usuários...');
      scheduleTagUpdateJob();
    } catch (err: any) {
        console.error('❌ Erro na inicialização:', err.message);
        // We still keep server running, but it might be unstable
    }

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
