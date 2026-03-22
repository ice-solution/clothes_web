const mongoose = require('mongoose');

const wardrobeSchema = new mongoose.Schema(
  {
    shortCode: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: '我的衣櫃' },
    editToken: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wardrobe', wardrobeSchema);
