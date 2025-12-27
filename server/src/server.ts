import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import pool from './db';
import usersRouter from './routes/users';
import friendsRouter from './routes/friends';
import adminRouter from './routes/admin';
import matchmakingRouter from './routes/matchmaking';
import gameRouter from './routes/game';

dotenv.config();


const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'https://marmot0814.github.io',
  'https://zhuyin-battle.marmot0814.com'
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api/users', usersRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/matchmaking', matchmakingRouter);
app.use('/api/game', gameRouter);

// Serve static files from the 'public' directory (which will contain the built frontend)
const publicPath = path.join(__dirname, '../public');
if (require('fs').existsSync(publicPath)) {
  console.log('Serving static files from:', publicPath);
  app.use(express.static(publicPath));
  
  // Handle SPA routing: return index.html for any unknown route not starting with /api
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(publicPath, 'index.html'));
    }
  });
}

// Initialize database and start server
async function start() {
  try {
    // Test database connection
    const result = await pool.query('SELECT NOW()');
    console.log('✓ Database connected:', result.rows[0]);

    // Initialize tables (only if not exists)
    const fs = require('fs');
    const initSQL = fs.readFileSync('./src/db/init.sql', 'utf8');
    const statements = initSQL.split(';').filter((s: string) => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }
    console.log('✓ Database tables initialized');

    // Start server
    app.listen(PORT, () => {
      console.log(`\n🎮 Zhuyin Battle Server running at http://localhost:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
