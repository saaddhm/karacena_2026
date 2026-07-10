import QRCode from 'qrcode';
import crypto from 'crypto';

export function generateReference() {
  return 'KRC-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

export function generateTicketCode() {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}

// text: the opaque ticket code only — no customer data, not guessable.
export async function generateQr(text) {
  return QRCode.toDataURL(String(text), {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: { dark: '#1E2D4D', light: '#FAF3EB' }
  });
}
