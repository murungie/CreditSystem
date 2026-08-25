import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';

import authRoutes from './routes/auth';
import borrowerRoutes from './routes/borrower';
import salesRoutes from './routes/sales';
import sanctionRoutes from './routes/sanction';
import disbursementRoutes from './routes/disbursement';
import collectionRoutes from './routes/collection';
import adminRoutes from './routes/admin';
import mpesaRoutes from './routes/mpesa';

import { errorHandler, notFound } from './middleware/errorHandler';

const app: Application = express();

//CORS 
// Allow localhost:3000 and any FRONTEND_URL set in .env
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In development, allow all localhost origins
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle preflight OPTIONS requests for all routes
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

//Health check 
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'LMS API running',
    timestamp: new Date().toISOString(),
  });
});

//Public Route
app.get("/", (req, res) => {
  res.send("LMS Backend Successfully Deployed ");
});

//Routes 
app.use('/api/auth', authRoutes);
app.use('/api/borrower', borrowerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/sanction', sanctionRoutes);
app.use('/api/disbursement', disbursementRoutes);
app.use('/api/collection', collectionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mpesa', mpesaRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
