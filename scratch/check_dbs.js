import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civicpulse';

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');
    
    // Get database name
    const dbName = mongoose.connection.db.databaseName;
    console.log('Current connected database name:', dbName);

    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in current database:', collections.map(c => c.name));

    // List all databases
    const adminDb = mongoose.connection.db.admin();
    const dbsList = await adminDb.listDatabases();
    console.log('All databases in Atlas cluster:');
    dbsList.databases.forEach(db => {
      console.log(` - Name: ${db.name}, Size: ${db.sizeOnDisk} bytes`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();
