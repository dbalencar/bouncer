import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeOpa } from './config/opa';
import tenantRoutes from './routes/tenants';
import subjectRoutes from './routes/subjects';
import policyRoutes from './routes/policies';
import evaluateRoutes from './routes/evaluate';
import permissionRoutes from './routes/permissions';
import roleRoutes from './routes/roles';

dotenv.config();

export const createApp = async (): Promise<Application> => {
  const app = express();

  // Middleware
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize OPA
  await initializeOpa();

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/tenants', tenantRoutes);
  app.use('/subjects', subjectRoutes);
  app.use('/', policyRoutes);
  app.use('/', evaluateRoutes);
  app.use('/', permissionRoutes);
  app.use('/', roleRoutes);

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
};
