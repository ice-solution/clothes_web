require('dotenv').config();
const path = require('path');
const express = require('express');
const multer = require('multer');
const { connectDb } = require('./config/db');
const wardrobeRoutes = require('./routes/wardrobe');

async function main() {
  await connectDb();

  const app = express();
  if (process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
  }
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.use(wardrobeRoutes);

  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message || '上傳失敗' });
    }
    if (err && err.message && req.path && req.path.startsWith('/api/')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  });

  app.use((req, res) => {
    res.status(404).render('error', { title: '找不到', message: '此頁面不存在' });
  });

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`衣櫃 QR 已啟動：http://localhost:${port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
