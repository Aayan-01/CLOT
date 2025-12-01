import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import uploadRoutes from './routes/upload';
import chatRoutes from './routes/chat';
import "dotenv/config";


dotenv.config();

const app = express();
// Ensure PORT is a number — when reading from process.env it's a string, and
// Cloud Build / TypeScript can treat it as string which causes TS2769 when
// passing to server.listen. Convert to number explicitly and fall back to 8080.
const PORT: number = process.env.PORT ? Number(process.env.PORT) : 8080;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Serve uploaded files only when not using GCS (local dev)
if (!process.env.GCS_BUCKET_NAME) {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
}

// API Routes
app.use('/api', uploadRoutes);
app.use('/api', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all for frontend routing in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Create an HTTP server and explicitly listen on 0.0.0.0 so Cloud Run and other
// container platforms can bind to the container's network interface instead
// of localhost.
import http from 'http';

const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(
    `🔑 Gemini API configured: ${!!(process.env.GOOGLE_CLOUD_GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_FLASH_API_KEY)}`
  );
});

export default app;