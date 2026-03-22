const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { nanoid } = require('nanoid');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${nanoid(12)}${ext}`);
  },
});

const imageFilter = (_req, file, cb) => {
  const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
  if (ok) cb(null, true);
  else cb(new Error('只接受 JPEG、PNG、GIF、WebP 圖片'));
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 24;

const upload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_FILES_PER_UPLOAD },
  fileFilter: imageFilter,
});

module.exports.MAX_FILES_PER_UPLOAD = MAX_FILES_PER_UPLOAD;

module.exports.upload = upload;
module.exports.uploadDir = uploadDir;
