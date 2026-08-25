import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI as string;
  if (!uri) throw new Error('MONGODB_URI not set in environment');

  await mongoose.connect(uri);
  console.log(' MongoDB connected:', mongoose.connection.host);
};

export default connectDB;
