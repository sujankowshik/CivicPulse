import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../server/models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civicpulse';

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected. Querying users...');
    const users = await User.find({}, '-password');
    console.log('Found users:', JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();
