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
import resourceGroupRoutes from './routes/resourceGroups';
import resourceRoutes from './routes/resources';
import grantRoutes from './routes/grants';
import grantRequestRoutes from './routes/grantRequests';
import auditLogRoutes from './routes/auditLogs';
import authRoutes from './routes/auth';
import { auditLogger } from './middleware/auditLogger';
import { authMiddleware } from './middleware/auth';
import { getAuthConfig, assertAuthConfigValid } from './config/auth';

dotenv.config();

export const createApp = async (): Promise<Application> => {
  const app = express();

  // Disable X-Powered-By header for security
  app.disable('x-powered-by');

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

  // Log the auth posture loudly at boot — easy to miss otherwise.
  // Validate required vars so an oidc-mode misconfig fails here once
  // instead of spamming a stack trace on every request.
  const authConfig = getAuthConfig();
  assertAuthConfigValid(authConfig);
  console.log(`Auth mode: ${authConfig.mode}${authConfig.mode === 'oidc' ? ` (issuer: ${authConfig.issuer})` : ''}`);

  // Auth middleware: in mock mode reads X-Actor-Uid; in oidc mode
  // requires a valid Bearer on every non-public route.
  app.use(authMiddleware);

  // Audit logger middleware (runs before routes; logs after successful writes)
  app.use(auditLogger);

  // Routes
  app.use('/auth', authRoutes);
  app.use('/tenants', tenantRoutes);
  app.use('/subjects', subjectRoutes);
  app.use('/', policyRoutes);
  app.use('/', evaluateRoutes);
  app.use('/', permissionRoutes);
  app.use('/', roleRoutes);
  app.use('/', resourceGroupRoutes);
  app.use('/', resourceRoutes);
  app.use('/', grantRoutes);
  app.use('/', grantRequestRoutes);
  app.use('/', auditLogRoutes);

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
};
