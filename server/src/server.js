import 'dotenv/config';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { registerSockets } from './sockets/index.js';
import { connectDatabase } from './config/db.js';

const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
};

export function createRealtimeServer(httpServer) {
  return new Server(httpServer, {
    cors: {
      origin: config.clientOrigin,
      credentials: true,
    },
  });
}

export async function startServer() {
  await connectDatabase();

  const app = createApp({ clientOrigin: config.clientOrigin });
  const httpServer = createServer(app);
  const io = createRealtimeServer(httpServer);

  registerSockets(io);

  httpServer.listen(config.port, () => {
    console.log(`WatchNest server listening on port ${config.port}`);
  });

  return { app, httpServer, io };
}

startServer().catch((error) => {
  console.error('Failed to start WatchNest server:', error);
  process.exit(1);
});
