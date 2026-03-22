const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const router = express.Router();

function safeNextPath(nextParam) {
  if (!nextParam || typeof nextParam !== 'string') return '/wardrobes';
  if (!nextParam.startsWith('/') || nextParam.startsWith('//')) return '/wardrobes';
  return nextParam.slice(0, 512);
}

router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect(safeNextPath(req.query.next));
  }
  res.render('login', {
    title: '登入',
    error: null,
    next: req.query.next || '',
    username: '',
  });
});

router.post('/login', async (req, res) => {
  const username = String(req.body.username || '')
    .trim()
    .toLowerCase();
  const password = req.body.password || '';
  const next = safeNextPath(req.body.next);

  if (!username || !password) {
    return res.status(400).render('login', {
      title: '登入',
      error: '請輸入帳號與密碼',
      next: req.body.next || '',
      username: req.body.username || '',
    });
  }

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(401).render('login', {
      title: '登入',
      error: '帳號或密碼錯誤',
      next: req.body.next || '',
      username: req.body.username || '',
    });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).render('login', {
      title: '登入',
      error: '帳號或密碼錯誤',
      next: req.body.next || '',
      username: req.body.username || '',
    });
  }

  req.session.userId = user._id.toString();
  req.session.username = user.username;
  req.session.save((err) => {
    if (err) {
      console.error(err);
      return res.status(500).render('login', {
        title: '登入',
        error: '登入狀態儲存失敗，請稍後再試',
        next: req.body.next || '',
        username: req.body.username || '',
      });
    }
    res.redirect(next);
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
