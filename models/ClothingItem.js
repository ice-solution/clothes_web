const mongoose = require('mongoose');

const clothingItemSchema = new mongoose.Schema(
  {
    wardrobeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wardrobe',
      required: true,
      index: true,
    },
    description: { type: String, default: '' },
    imageFilename: { type: String, required: true },
    imageHash: { type: String, default: '' },
    /** 放置位置，例如：上格左、抽屜 2 */
    position: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClothingItem', clothingItemSchema);
