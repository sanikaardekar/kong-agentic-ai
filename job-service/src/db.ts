import { MongoClient, Db, Collection } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToMongoDB(): Promise<Db> {
  if (db) {
    return db;
  }

  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db('job-search-db');
    
    console.log('✓ Connected to MongoDB Atlas');
    
    // Create indexes
    const jobsCollection = db.collection('jobs');
    await jobsCollection.createIndex({ jobId: 1 }, { unique: true });
    await jobsCollection.createIndex({ company: 1 });
    await jobsCollection.createIndex({ location: 1 });
    await jobsCollection.createIndex({ createdAt: -1 });
    
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export function getJobsCollection(): Collection {
  if (!db) {
    throw new Error('Database not connected. Call connectToMongoDB first.');
  }
  return db.collection('jobs');
}

export async function closeMongoDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}
