/**
 * 對外絕對網址（QR、分享連結、範例網址）。
 * 優先順序：DOMAIN → BASE_URL → 目前請求的 protocol + host。
 */
function publicBaseUrl(req) {
  const fromEnv = (process.env.DOMAIN || process.env.BASE_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const host = req.get('host');
  if (!host) return 'http://localhost:3000';
  const proto = req.protocol || 'http';
  return `${proto}://${host}`;
}

module.exports = { publicBaseUrl };
