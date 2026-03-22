require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const multer = require('multer');
const { connectDb } = require('./config/db');
const { ensureSeedAdmin } = require('./lib/ensureSeedAdmin');
const authRoutes = require('./routes/auth');
const wardrobeRoutes = require('./routes/wardrobe');

async function main() {
  await connectDb();
  await ensureSeedAdmin();

  const app = express();
  if (process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
  }
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  const mongoUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clothes_wardrobe';
  const cookieSecure = process.env.COOKIE_SECURE === '1';

  app.use(
    session({
      name: 'closet.sid',
      secret: process.env.SESSION_SECRET || 'dev-change-session-secret',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({ mongoUrl }),
      cookie: {
        maxAge: 14 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: cookieSecure,
        sameSite: 'lax',
      },
    })
  );

  app.use((req, res, next) => {
    res.locals.currentUser = req.session && req.session.username ? req.session.username : null;
    next();
  });

  app.use(express.static(path.join(__dirname, 'public')));

  app.use(authRoutes);
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
