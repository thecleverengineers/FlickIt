import { MongoClient } from 'mongodb';

export const client = process.env.MONGODB_URI
  ? new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  : null;

export const database = client?.db(process.env.MONGODB_DATABASE || 'dimapur_quick_commerce');
