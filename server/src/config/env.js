// Environment parsing and defaults belong here.
// Export normalized values such as port, clientOrigin, nodeEnv, and room settings.

export const env = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 4000,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI ?? null,
};
