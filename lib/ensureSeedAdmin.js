const bcrypt = require('bcrypt');
const User = require('../models/User');

/**
 * 若資料庫尚無使用者，且環境變數有 ADMIN_USERNAME / ADMIN_PASSWORD，則建立第一位管理員。
 */
async function ensureSeedAdmin() {
  const count = await User.countDocuments();
  if (count > 0) return;

  const username = (process.env.ADMIN_USERNAME || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.warn(
      '[auth] 資料庫內尚無帳號。請在 .env 設定 ADMIN_USERNAME、ADMIN_PASSWORD 後重啟，以建立第一位管理員。'
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ username, passwordHash });
  console.log('[auth] 已建立第一位管理員帳號：', username);
}

module.exports = { ensureSeedAdmin };
