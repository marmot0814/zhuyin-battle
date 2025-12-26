import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db';
import usersRouter from './routes/users';
import friendsRouter from './routes/friends';
import adminRouter from './routes/admin';
import matchmakingRouter from './routes/matchmaking';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'https://marmot0814.github.io'
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
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api/users', usersRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/matchmaking', matchmakingRouter);

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
