import crypto from 'crypto';

/**
 * Hashes an IP address with a secret salt to ensure privacy.
 * No raw IP addresses are stored or displayed anywhere in the system.
 */
export const hashIp = (ip = '127.0.0.1') => {
  const salt = process.env.IP_SALT;
  if (!salt) {
    throw new Error('FATAL CONFIGURATION ERROR: IP_SALT environment variable is required.');
  }

  const cleanIp = String(ip).replace('::ffff:', '').trim();
  return crypto.createHmac('sha256', salt).update(cleanIp).digest('hex');
};
