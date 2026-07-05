import crypto from 'crypto';

/**
 * Generates a unique license key in format: KR-XXXX-XXXX-XXXX
 * Uses cryptographically secure random bytes, uppercase alphanumeric only.
 */
export function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segment = (len: number) =>
    Array.from(crypto.randomBytes(len))
      .map((b) => chars[b % chars.length])
      .join('');

  return `KR-${segment(4)}-${segment(4)}-${segment(4)}`;
}

/**
 * Validates license key format.
 */
export function isValidLicenseKeyFormat(key: string): boolean {
  return /^KR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key);
}
