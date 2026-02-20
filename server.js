// server.js
import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import cors from 'cors';
import routes from './routes/index.js';

// Load environment variables
dotenv.config();

const app = express();
// Middleware
app.use(express.json());
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://autoabdb.com'
  ],
  
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, 
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));
// Routes - mount at root and /api (for reverse proxies that use /api prefix)
app.use('/', routes);
app.use('/api', routes);

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
