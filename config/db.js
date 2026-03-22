const mongoose = require('mongoose');

async function connectDb() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clothes_wardrobe';
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
}

module.exports = { connectDb };
