const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const QRCode = require('qrcode');
const { nanoid } = require('nanoid');
const Wardrobe = require('../models/Wardrobe');
const ClothingItem = require('../models/ClothingItem');
const { upload } = require('../middleware/upload');
const { computeAverageHash, hammingDistance } = require('../lib/imageHash');

const router = express.Router();

function baseUrl(req) {
  return (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

async function loadWardrobeByCode(code, withToken = false) {
  const q = Wardrobe.findOne({ shortCode: code });
  if (withToken) q.select('+editToken');
  return q;
}

async function assertManage(req, res, next) {
  const { code } = req.params;
  if (req.session && req.session.userId) {
    const w = await Wardrobe.findOne({ shortCode: code });
    if (!w) {
      if (req.accepts('html')) {
        return res.status(404).render('error', { title: '找不到', message: '此衣櫃不存在' });
      }
      return res.status(404).json({ error: '衣櫃不存在' });
    }
    req.wardrobe = w;
    return next();
  }
  const token =
    req.body?.editToken ||
    req.query?.token ||
    req.headers['x-edit-token'];
  const w = await loadWardrobeByCode(code, true);
  if (!w || !token || w.editToken !== token) {
    if (req.accepts('html')) {
      return res.status(403).send('無效的管理連結或權限不足');
    }
    return res.status(403).json({ error: '無效的管理權限' });
  }
  req.wardrobe = w;
  next();
}

/** 首頁 */
router.get('/', (_req, res) => {
  res.render('index', { title: '衣櫃 QR' });
});

/** 全部衣櫃列表 */
router.get('/wardrobes', async (req, res) => {
  const wardrobes = await Wardrobe.find()
    .sort({ createdAt: -1 })
    .select('name shortCode createdAt')
    .lean();
  const ids = wardrobes.map((w) => w._id);
  let countMap = new Map();
  if (ids.length) {
    const counts = await ClothingItem.aggregate([
      { $match: { wardrobeId: { $in: ids } } },
      { $group: { _id: '$wardrobeId', count: { $sum: 1 } } },
    ]);
    countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
  }
  const list = wardrobes.map((w) => ({
    ...w,
    itemCount: countMap.get(w._id.toString()) || 0,
  }));
  res.render('wardrobes', {
    title: '全部衣櫃',
    wardrobes: list,
    baseUrlStr: baseUrl(req),
    loggedIn: !!(req.session && req.session.userId),
  });
});

/** 建立衣櫃 */
router.post('/wardrobes', async (req, res) => {
  const shortCode = nanoid(10);
  const editToken = nanoid(32);
  const name = (req.body.name || '我的衣櫃').trim().slice(0, 80);
  await Wardrobe.create({ shortCode, name, editToken });
  res.redirect(`/w/${shortCode}/manage?token=${encodeURIComponent(editToken)}`);
});

/** 掃碼後：公開列出衣物 */
router.get('/w/:code', async (req, res) => {
  const w = await Wardrobe.findOne({ shortCode: req.params.code });
  if (!w) return res.status(404).render('error', { title: '找不到', message: '此衣櫃不存在或已刪除' });
  const items = await ClothingItem.find({ wardrobeId: w._id }).sort({ updatedAt: -1 });
  res.render('wardrobe', {
    title: w.name,
    wardrobe: w,
    items,
    baseUrlStr: baseUrl(req),
    manageHint: true,
  });
});

/** 管理頁（已登入管理員免 token；否則需 ?token=） */
router.get('/w/:code/manage', async (req, res) => {
  const { code } = req.params;
  const token = req.query.token;
  const w = await Wardrobe.findOne({ shortCode: code });
  if (!w) {
    return res.status(404).render('error', { title: '找不到', message: '此衣櫃不存在或已刪除' });
  }

  const loggedIn = !!(req.session && req.session.userId);
  let tokenOk = false;
  if (token) {
    const wTok = await loadWardrobeByCode(code, true);
    tokenOk = !!(wTok && wTok.editToken === token);
  }

  if (!loggedIn && !tokenOk) {
    const nextQ = encodeURIComponent(req.originalUrl);
    return res.status(403).render('error', {
      title: '無法管理',
      messageHtml: `<span class="text-slate-300">請 <a href="/login?next=${nextQ}" class="font-medium text-indigo-300 underline hover:text-indigo-200">登入管理員帳號</a>，或使用建立衣櫃時提供的完整管理連結（含 token）。</span>`,
    });
  }

  const wFull = await loadWardrobeByCode(code, true);
  const items = await ClothingItem.find({ wardrobeId: w._id }).sort({ updatedAt: -1 });
  const listUrl = `${baseUrl(req)}/w/${code}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(listUrl, { width: 280, margin: 2 });
  } catch (e) {
    qrDataUrl = '';
  }

  const sessionAuth = loggedIn;
  const editTokenForClient = sessionAuth ? '' : token;
  const shareManageUrl =
    sessionAuth && wFull
      ? `${baseUrl(req)}/w/${code}/manage?token=${encodeURIComponent(wFull.editToken)}`
      : '';

  res.render('manage', {
    title: `管理 · ${w.name}`,
    wardrobe: w,
    items,
    editToken: editTokenForClient,
    sessionAuth,
    shareManageUrl,
    listUrl,
    qrDataUrl,
    baseUrlStr: baseUrl(req),
  });
});

/** QR 圖片（公開，方便下載） */
router.get('/w/:code/qr.png', async (req, res) => {
  const w = await Wardrobe.findOne({ shortCode: req.params.code });
  if (!w) return res.status(404).send('Not found');
  const url = `${baseUrl(req)}/w/${req.params.code}`;
  const png = await QRCode.toBuffer(url, { type: 'png', width: 400, margin: 2 });
  res.type('png').send(png);
});

/** API：新增衣物 */
router.post('/api/w/:code/items', upload.single('image'), assertManage, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '請上傳圖片' });
    }
    const buf = await fs.readFile(req.file.path);
    const imageHash = await computeAverageHash(buf);
    const description = (req.body.description || '').trim().slice(0, 500);
    const position = (req.body.position || '').trim().slice(0, 120);
    const item = await ClothingItem.create({
      wardrobeId: req.wardrobe._id,
      description,
      position,
      imageFilename: req.file.filename,
      imageHash,
    });
    if (req.accepts('html')) {
      if (req.session && req.session.userId) {
        return res.redirect(`/w/${req.params.code}/manage`);
      }
      return res.redirect(`/w/${req.params.code}/manage?token=${encodeURIComponent(req.body.editToken)}`);
    }
    res.json({ ok: true, item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || '伺服器錯誤' });
  }
});

/** API：更新衣物（multipart：editToken、description、position、可選 image） */
router.put(
  '/api/w/:code/items/:itemId',
  upload.single('image'),
  assertManage,
  async (req, res) => {
    try {
      const item = await ClothingItem.findOne({
        _id: req.params.itemId,
        wardrobeId: req.wardrobe._id,
      });
      if (!item) return res.status(404).json({ error: '找不到項目' });

      if (req.body.description !== undefined) {
        item.description = String(req.body.description).trim().slice(0, 500);
      }
      if (req.body.position !== undefined) {
        item.position = String(req.body.position).trim().slice(0, 120);
      }
      if (req.file) {
        const oldPath = path.join(__dirname, '..', 'public', 'uploads', item.imageFilename);
        const buf = await fs.readFile(req.file.path);
        item.imageHash = await computeAverageHash(buf);
        item.imageFilename = req.file.filename;
        fs.unlink(oldPath).catch(() => {});
      }
      await item.save();
      res.json({ ok: true, item });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || '伺服器錯誤' });
    }
  }
);

/** API：刪除 */
router.delete('/api/w/:code/items/:itemId', express.json(), assertManage, async (req, res) => {
  const item = await ClothingItem.findOne({
    _id: req.params.itemId,
    wardrobeId: req.wardrobe._id,
  });
  if (!item) return res.status(404).json({ error: '找不到項目' });
  const fp = path.join(__dirname, '..', 'public', 'uploads', item.imageFilename);
  await ClothingItem.deleteOne({ _id: item._id });
  fs.unlink(fp).catch(() => {});
  res.json({ ok: true });
});

/** 以圖搜尋（同一衣櫃內近似） */
router.post('/api/w/:code/similar', upload.single('query'), async (req, res) => {
  try {
    const w = await Wardrobe.findOne({ shortCode: req.params.code });
    if (!w) return res.status(404).json({ error: '衣櫃不存在' });
    if (!req.file) return res.status(400).json({ error: '請上傳要比對的照片' });

    const buf = await fs.readFile(req.file.path);
    await fs.unlink(req.file.path).catch(() => {});
    const queryHash = await computeAverageHash(buf);

    const items = await ClothingItem.find({ wardrobeId: w._id }).lean();
    const ranked = items
      .map((it) => ({
        ...it,
        distance: hammingDistance(queryHash, it.imageHash || ''),
        score: Math.max(0, 64 - hammingDistance(queryHash, it.imageHash || '')),
      }))
      .sort((a, b) => a.distance - b.distance);

    res.json({
      queryHashPreview: queryHash.slice(0, 8) + '…',
      results: ranked.slice(0, 12).map((it) => ({
        _id: it._id,
        description: it.description,
        position: it.position,
        imageUrl: `/uploads/${it.imageFilename}`,
        distance: it.distance,
        score: it.score,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || '伺服器錯誤' });
  }
});

module.exports = router;
