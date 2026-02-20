import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is not defined in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });
    console.log('MongoDB connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    if (err.message?.includes('ECONNREFUSED')) {
      console.error('Ensure MongoDB is running (e.g. mongod) and reachable at', mongoUri.replace(/\/\/[^@]+@/, '//***@'));
    }
    process.exit(1);
  }
};

export default connectDB;
