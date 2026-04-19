const mongoose = require('mongoose');

const wardrobeSchema = new mongoose.Schema(
  {
    shortCode: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: '我的衣櫃' },
    /** 衣櫃封面圖（僅檔名，存於 public/uploads） */
    coverImageFilename: { type: String, default: '' },
    editToken: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wardrobe', wardrobeSchema);
