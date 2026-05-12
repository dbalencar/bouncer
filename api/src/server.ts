import { createApp } from './app';

const startServer = async () => {
  try {
    const app = await createApp();
    const port = process.env.PORT || 3001;

    app.listen(port, () => {
      console.log(`Bouncer API server running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
