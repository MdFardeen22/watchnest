import cors from 'cors';
import express from 'express';

const DEFAULT_CLIENT_ORIGIN = 'http://localhost:5173';

export function createApp({ clientOrigin = process.env.CLIENT_ORIGIN ?? DEFAULT_CLIENT_ORIGIN } = {}) {
  const app = express();

  app.disable('x-powered-by');

  app.use(cors({
    origin: clientOrigin,
    credentials: true,
  }));

  app.use(express.json({ limit: '32kb' }));

  app.get('/health', (_request, response) => {
    response.status(200).json({
      ok: true,
      service: 'watchnest-api',
      uptime: process.uptime(),
    });
  });

  app.use((_request, response) => {
    response.status(404).json({
      error: 'NOT_FOUND',
      message: 'Route not found.',
    });
  });

  app.use((error, _request, response, _next) => {
    const statusCode = Number(error.statusCode) || 500;

    response.status(statusCode).json({
      error: error.code ?? 'INTERNAL_SERVER_ERROR',
      message: statusCode === 500 ? 'Unexpected server error.' : error.message,
    });
  });

  return app;
}
