import { isNativeApp } from './native';

/**
 * Face ID as a LOCAL lock, not a login.
 *
 * The Supabase session lives in localStorage on the device and stays valid for
 * a long time, which is what makes the app pleasant — nobody wants to type a
 * password to see what's for dinner. The cost is that an unlocked phone is an
 * unlocked Fornello, holding a family's allergies, their week, and their
 * grandmother's recipes.
 *
 * Face ID closes that without touching the session: authentication still
 * happens against Supabase, and this only decides whether the app is shown.
 * It cannot be used to sign in, and it is deliberately not a second factor.
 *
 * The preference is stored per-device, not in settings. Biometrics belong to a
 * phone, not to a household — enabling it on an iPhone must not lock someone
 * out of a laptop that has no Face ID at all.
 */
const KEY = 'fornello:biometric-lock';
const LAST_ACTIVE = 'fornello:last-active';

// Long enough to check a shopping list in another app and come back, short
// enough that a phone left on a table re-locks. Banking apps lock instantly;
// a meal planner that did would just be uninstalled.
const RELOCK_AFTER_MS = 2 * 60 * 1000;

export type Biometry = { available: boolean; name: string };

export async function biometryAvailable(): Promise<Biometry> {
  if (!isNativeApp()) return { available: false, name: '' };
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    const info = await BiometricAuth.checkBiometry();
    const names: Record<number, string> = { 1: 'Touch ID', 2: 'Face ID', 3: 'Optic ID' };
    return {
      available: Boolean(info.isAvailable),
      name: names[info.biometryType as number] || 'biometrics',
    };
  } catch {
    return { available: false, name: '' };
  }
}

export function lockEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(KEY) === '1';
}

export function setLockEnabled(on: boolean): void {
  window.localStorage.setItem(KEY, on ? '1' : '0');
  if (on) markActive();
}

export function markActive(): void {
  try { window.localStorage.setItem(LAST_ACTIVE, String(Date.now())); } catch { /* private mode */ }
}

/** True when the app should ask before showing anything. */
export function shouldLock(): boolean {
  if (!isNativeApp() || !lockEnabled()) return false;
  const last = Number(window.localStorage.getItem(LAST_ACTIVE) || 0);
  return !last || Date.now() - last > RELOCK_AFTER_MS;
}

export async function authenticate(reason: string): Promise<boolean> {
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Cancel',
      // The passcode fallback is not a weakening — a face can fail for
      // ordinary reasons (a mask, bad light, a sibling holding the phone), and
      // without it the only way back in is deleting the app.
      allowDeviceCredential: true,
      iosFallbackTitle: 'Use passcode',
    });
    markActive();
    return true;
  } catch {
    return false;
  }
}
