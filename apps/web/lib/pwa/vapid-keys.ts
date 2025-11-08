/**
 * VAPID Keys Management
 *
 * VAPID (Voluntary Application Server Identification) keys are used
 * to identify your application to push services.
 *
 * IMPORTANT: Generate your own keys using:
 * npx web-push generate-vapid-keys
 *
 * Then set these environment variables:
 * NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
 * VAPID_PRIVATE_KEY=your_private_key
 * VAPID_SUBJECT=mailto:your@email.com
 */

export const VAPID_CONFIG = {
  publicKey:
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    'BEl62iUYgUivxIkv69yViEuiBIa-Ib27SzkkpGzEZ3lAGKv_U_8h1TFf9Kw3LQ6O4dFz5r1JxL5lKx1c9KqK2Zo', // Default for development
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
  subject:
    process.env.VAPID_SUBJECT || 'mailto:admin@tournamentplatform.com',
};

/**
 * Get public VAPID key for client-side subscription
 */
export function getPublicVapidKey(): string {
  return VAPID_CONFIG.publicKey;
}

/**
 * Validate VAPID configuration
 */
export function validateVapidConfig(): boolean {
  if (!VAPID_CONFIG.publicKey || !VAPID_CONFIG.privateKey) {
    console.warn(
      'VAPID keys not configured. Push notifications will not work in production.'
    );
    return false;
  }
  return true;
}

/**
 * Convert VAPID key to Uint8Array for subscription
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
