import mongoose from 'mongoose';
import { env } from './env.js';

const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017/watchnest';

export async function connectDatabase() {
  const mongoUri = env.MONGODB_URI || DEFAULT_MONGODB_URI;

  mongoose.set('strictQuery', true);

  const connection = await mongoose.connect(mongoUri);

  console.info(`Connected to MongoDB at ${mongoUri}`);
  return connection;
}
