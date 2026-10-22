import mongoose from "mongoose";

/**
 * Conexão com o MongoDB Atlas reaproveitada entre invocações
 * (essencial em ambiente serverless como a Vercel).
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalForMongo = globalThis as unknown as { _mongoose?: Cache };
const cached: Cache = globalForMongo._mongoose ?? { conn: null, promise: null };
globalForMongo._mongoose = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Defina a variável de ambiente MONGODB_URI (veja .env.example).");

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || "gerenciador-tarefas",
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}
