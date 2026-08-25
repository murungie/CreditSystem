import dns from 'dns';
import dotenv from 'dotenv';

import app from './app';
import connectDB from './config/database';

// Load environment variables first
dotenv.config();

// Use public DNS resolvers
dns.setServers(['8.8.8.8', '1.1.1.1']);

const PORT = Number(process.env.PORT) || 5000;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    app.listen(PORT, '0.0.0.0', () => {
      console.log('\nLMS Backend Server Started');
      console.log(`Port:     ${PORT}`);
      console.log(`API:      http://localhost:${PORT}/api`);
      console.log(`Health:   http://localhost:${PORT}/health\n`);
    });
  } catch (error) {
    console.error('Server failed to start:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();