import crypto from 'crypto';

function conf() {
  return {
    clientid: process.env.CMI_MERCHANT_ID,
    storeKey: process.env.CMI_STORE_KEY,
    gatewayUrl: process.env.CMI_GATEWAY_URL || 'https://payment.cmi.co.ma/fim/est3Dgate',
    apiUrl: process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`,
    clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0]
  };
}

export function cmiConfigured() {
  const c = conf();
  return Boolean(c.clientid && c.storeKey);
}

export function clientBaseUrl() {
  return conf().clientUrl;
}

// CMI "ver3" hash: sort param names case-insensitively (hash & encoding excluded),
// escape \ and |, join values with |, append store key, SHA-512 → base64.
function computeHash(params, storeKey) {
  const esc = (v) => String(v ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
  const plain = Object.keys(params)
    .filter((k) => !['hash', 'encoding'].includes(k.toLowerCase()))
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), 'en'))
    .map((k) => esc(params[k]))
    .join('|') + '|' + esc(storeKey);
  return crypto.createHash('sha512').update(plain, 'utf8').digest('base64');
}

// Build the auto-submitted form fields for the hosted payment page.
export function buildPaymentForm(booking, { lang = 'fr' } = {}) {
  const { clientid, storeKey, gatewayUrl, apiUrl } = conf();
  const fields = {
    clientid,
    storetype: '3D_PAY_HOSTING',
    trantype: 'PreAuth',
    amount: Number(booking.totalMad).toFixed(2),
    currency: '504', // MAD
    oid: booking.reference,
    okUrl: `${apiUrl}/api/bookings/cmi/return`,
    failUrl: `${apiUrl}/api/bookings/cmi/return`,
    callbackUrl: `${apiUrl}/api/bookings/cmi/callback`,
    lang: lang === 'en' ? 'en' : 'fr',
    email: booking.customerEmail,
    BillToName: booking.customerName,
    tel: booking.customerPhone || '',
    hashAlgorithm: 'ver3',
    rnd: crypto.randomBytes(10).toString('hex'),
    sessiontimeout: '900'
  };
  fields.HASH = computeHash(fields, storeKey);
  fields.encoding = 'UTF-8';
  return { gatewayUrl, fields };
}

// Verify the HASH CMI sends to callbackUrl / okUrl / failUrl.
export function verifyCmiHash(body) {
  const received = body.HASH || body.hash;
  if (!received) return false;
  const expected = computeHash(body, conf().storeKey);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(received));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
