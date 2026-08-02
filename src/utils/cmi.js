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
  if (!process.env.CLIENT_URL) {
    console.error('[payment] CLIENT_URL is NOT set — falling back to http://localhost:5173. '
      + 'Set CLIENT_URL to the public HTTPS website origin in server/.env');
  }
  return conf().clientUrl;
}

/*
|--------------------------------------------------------------------------
| CMI ver3 (SHA-512) hashing — exact port of the official PHP sample
|--------------------------------------------------------------------------
| Official algorithm (fim/est3Dgate, hashAlgorithm=ver3):
|   1. Collect ALL posted parameter names.
|   2. natcasesort($postParams)            → case-insensitive NATURAL sort,
|      byte-based (ASCII), digit runs compared numerically. NOT the same as
|      JS localeCompare(), which uses ICU/locale collation.
|   3. For each param whose lowercased name is neither "hash" nor "encoding":
|        $v = html_entity_decode(preg_replace("/\n$/", "", $v), ENT_QUOTES, 'UTF-8')
|        $v = str_replace("|", "\\|", str_replace("\\", "\\\\", $v))
|        $plain .= $v . "|"
|   4. Append the escaped store key (NO trailing "|").
|   5. base64( raw SHA-512( utf8($plain) ) ).
| The entity-decode + trailing-newline strip apply to VERIFICATION of what
| CMI posts back (CMI hashes the decoded values but may transmit them
| HTML-entity-encoded). When BUILDING the request we hash our raw values.
*/

const EXCLUDED_FIELDS = ['hash', 'encoding'];

// PHP strnatcasecmp() — the comparator behind natcasesort().
function strnatcasecmp(sa, sb) {
  const a = sa.toLowerCase();
  const b = sb.toLowerCase();
  let i = 0;
  let j = 0;
  const isDigit = (c) => c >= '0' && c <= '9';
  while (i < a.length && j < b.length) {
    if (isDigit(a[i]) && isDigit(b[j])) {
      let ia = i;
      let jb = j;
      while (ia < a.length && isDigit(a[ia])) ia += 1;
      while (jb < b.length && isDigit(b[jb])) jb += 1;
      const na = a.slice(i, ia).replace(/^0+(?=\d)/, '');
      const nb = b.slice(j, jb).replace(/^0+(?=\d)/, '');
      if (na.length !== nb.length) return na.length < nb.length ? -1 : 1;
      if (na !== nb) return na < nb ? -1 : 1;
      i = ia;
      j = jb;
      continue;
    }
    if (a[i] !== b[j]) return a[i] < b[j] ? -1 : 1;
    i += 1;
    j += 1;
  }
  if (i < a.length) return 1;
  if (j < b.length) return -1;
  return 0;
}

// PHP html_entity_decode(..., ENT_QUOTES, 'UTF-8') — single pass, so
// "&amp;lt;" decodes to "&lt;" (not "<"), exactly like PHP.
function htmlEntityDecode(s) {
  return s.replace(
    /&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos|nbsp);/g,
    (match, ent) => {
      if (ent[0] === '#') {
        const code = ent[1] === 'x' || ent[1] === 'X'
          ? parseInt(ent.slice(2), 16)
          : parseInt(ent.slice(1), 10);
        return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : match;
      }
      return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[ent] || match;
    }
  );
}

// str_replace("|","\\|", str_replace("\\","\\\\",$v)) — backslash FIRST.
function escapeCmi(v) {
  return String(v ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

// Normalize a body value: qs may yield arrays for duplicate keys; PHP's
// $_POST keeps the LAST occurrence, so mirror that.
function rawValue(v) {
  if (Array.isArray(v)) v = v[v.length - 1];
  if (v !== null && typeof v === 'object') v = '';
  return String(v ?? '');
}

// PHP verification transform: strip ONE trailing newline, then entity-decode.
function decodeValue(v) {
  return htmlEntityDecode(rawValue(v).replace(/\r?\n$/, ''));
}

/**
 * Build the ver3 plaintext for a parameter set.
 * @param {object} params            posted/request fields
 * @param {string} storeKey          CMI store key
 * @param {boolean} decode           apply PHP callback transforms (newline strip + entity decode)
 * @returns {{ plain, keysUsed, keysExcluded }}
 */
function buildPlainText(params, storeKey, decode) {
  const allKeys = Object.keys(params || {});
  const keysExcluded = allKeys.filter((k) => EXCLUDED_FIELDS.includes(k.toLowerCase()));
  const keysUsed = allKeys
    .filter((k) => !EXCLUDED_FIELDS.includes(k.toLowerCase()))
    .sort(strnatcasecmp);
  const plain = keysUsed
    .map((k) => escapeCmi(decode ? decodeValue(params[k]) : rawValue(params[k])))
    .join('|') + '|' + escapeCmi(storeKey);
  return { plain, keysUsed, keysExcluded };
}

function sha512Base64(plain) {
  return crypto.createHash('sha512').update(plain, 'utf8').digest('base64');
}

// Hash for OUTGOING requests (our own raw values — no decoding).
export function computeHash(params, storeKey) {
  return sha512Base64(buildPlainText(params, storeKey, false).plain);
}

// Build the auto-submitted form fields for the hosted payment page.
export function buildPaymentForm(booking, { lang = 'fr' } = {}) {
  const { clientid, storeKey, gatewayUrl, apiUrl } = conf();
  const fields = {
    clientid,
    storetype: '3D_PAY_HOSTING',
    trantype: 'PreAuth', // le compte marchand (Attijari/CMI) est configuré en pré-autorisation ;
    // 'Sales' est refusé par la passerelle (« API object doesn't have enough attributes »).
    // La capture est déclenchée par le callback qui répond ACTION=POSTAUTH.
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
  fields.encoding = 'UTF-8'; // excluded from the hash, exactly like the official sample
  return { gatewayUrl, fields };
}

/**
 * Verify the HASH CMI posts to callbackUrl / okUrl / failUrl, and return full
 * diagnostics. The store key NEVER appears in the returned data: the plaintext
 * is truncated before the appended key.
 *
 * Verification is attempted with the exact PHP callback transforms (trailing-
 * newline strip + html_entity_decode) and, as a compatibility fallback, on the
 * raw values. Both are keyed SHA-512 checks — no security is lost.
 */
export function verifyCmiHashDetailed(body) {
  const { storeKey } = conf();
  const hashKey = Object.keys(body || {}).find((k) => k.toLowerCase() === 'hash');
  const received = hashKey ? rawValue(body[hashKey]) : null;

  const decoded = buildPlainText(body, storeKey, true);
  const raw = buildPlainText(body, storeKey, false);

  // Masked plaintext, built by construction — the store key never enters it.
  const plainMasked = decoded.keysUsed
    .map((k) => escapeCmi(decodeValue(body[k])))
    .join('|') + '|<STORE_KEY masked>';

  const expectedDecoded = sha512Base64(decoded.plain);
  const expectedRaw = sha512Base64(raw.plain);

  const safeEqual = (expected) => {
    if (!received) return false;
    const a = Buffer.from(expected);
    const b = Buffer.from(received);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };

  const valid = safeEqual(expectedDecoded) || safeEqual(expectedRaw);

  return {
    valid,
    expected: expectedDecoded,
    expectedRawVariant: expectedRaw,
    received,
    fieldCount: decoded.keysUsed.length,
    fieldsUsed: decoded.keysUsed,
    excludedFields: decoded.keysExcluded,
    plainMasked
  };
}

// Boolean façade — keeps the existing call sites working unchanged.
export function verifyCmiHash(body) {
  return verifyCmiHashDetailed(body).valid;
}
