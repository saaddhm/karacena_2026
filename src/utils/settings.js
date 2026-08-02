import { Setting } from '../models/index.js';

/**
 * Réglages globaux du site (table clé/valeur).
 * Valeurs par défaut si la clé n'existe pas encore en base.
 */
const DEFAULTS = {
  online_payment_enabled: 'true',
  reservations_enabled: 'true'
};

/** Lit un booléen de réglage (avec valeur par défaut). */
export async function getBoolSetting(key) {
  const row = await Setting.findByPk(key);
  const raw = row?.value ?? DEFAULTS[key] ?? 'false';
  return raw === 'true' || raw === '1';
}

/** Écrit un booléen de réglage. */
export async function setBoolSetting(key, value) {
  const v = value ? 'true' : 'false';
  await Setting.upsert({ key, value: v });
  return v === 'true';
}

/** Réglages exposés publiquement (drapeaux non sensibles). */
export async function getPublicSettings() {
  return {
    onlinePaymentEnabled: await getBoolSetting('online_payment_enabled'),
    reservationsEnabled: await getBoolSetting('reservations_enabled')
  };
}
