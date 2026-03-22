const sharp = require('sharp');

/**
 * 8×8 灰階平均雜湊（aHash），回傳 64 字元 '0'/'1' 字串
 */
async function computeAverageHash(imageBuffer) {
  const data = await sharp(imageBuffer)
    .resize(8, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer();

  let sum = 0;
  for (let i = 0; i < data.length; i += 1) sum += data[i];
  const mean = sum / data.length;

  let bits = '';
  for (let i = 0; i < data.length; i += 1) {
    bits += data[i] >= mean ? '1' : '0';
  }
  return bits;
}

function hammingDistance(bitsA, bitsB) {
  if (!bitsA || !bitsB) return 64;
  const n = Math.min(bitsA.length, bitsB.length);
  let d = 0;
  for (let i = 0; i < n; i += 1) {
    if (bitsA[i] !== bitsB[i]) d += 1;
  }
  return d + Math.abs(bitsA.length - bitsB.length);
}

module.exports = { computeAverageHash, hammingDistance };
