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
const OFFERED = 'fornello:biometric-offered';
const DELAY = 'fornello:biometric-delay';

/**
 * How long the app may sit in the background before it locks again.
 *
 * There is no correct value, which is why it is a choice. Instantly is right
 * for a phone that gets handed around and wrong for someone checking a
 * shopping list in another app every thirty seconds. The default is two
 * minutes because that survives the shopping-list case, which is the one this
 * app actually causes.
 */
export const RELOCK_OPTIONS = [
  { ms: 0,            label: 'Immediately' },
  { ms: 60_000,       label: 'After 1 minute' },
  { ms: 2 * 60_000,   label: 'After 2 minutes' },
  { ms: 15 * 60_000,  label: 'After 15 minutes' },
  { ms: 60 * 60_000,  label: 'After an hour' },
] as const;

const DEFAULT_RELOCK_MS = 2 * 60_000;

export function getRelockMs(): number {
  if (typeof window === 'undefined') return DEFAULT_RELOCK_MS;
  const raw = window.localStorage.getItem(DELAY);
  // Two traps, opposite directions. `|| DEFAULT` would turn "Immediately" (0)
  // into two minutes, giving the strictest choice the loosest behaviour. And
  // Number('') is 0, so an empty stored value would silently BECOME
  // "Immediately" for someone who never chose it. Both are wrong; treat empty
  // as absent and everything else as a number.
  if (raw == null || raw.trim() === '') return DEFAULT_RELOCK_MS;
  const n = Number(raw);
  return Number.isFinite(n) ? n : DEFAULT_RELOCK_MS;
}

export function setRelockMs(ms: number): void {
  window.localStorage.setItem(DELAY, String(ms));
}

/** Whether we have already asked. Asked once, never nagged. */
export function hasBeenOffered(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(OFFERED) === '1';
}

export function markOffered(): void {
  try { window.localStorage.setItem(OFFERED, '1'); } catch { /* private mode */ }
}

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

/**
 * Whether a Supabase session is stored on this device.
 *
 * Locking a signed-out app is a door in front of another door: the lock screen
 * appears, a face is scanned, and what is revealed is the login page. Worse, a
 * failed scan then looks like the app refusing to let someone log in.
 *
 * Read from localStorage rather than asked of Supabase, because this decides
 * what renders on the very first frame and must not wait on anything.
 */
function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i) || '';
      if (k.startsWith('sb-') && k.includes('auth-token')) return true;
    }
  } catch { /* private mode */ }
  return false;
}

/** True when the app should ask before showing anything. */
export function shouldLock(): boolean {
  if (!isNativeApp() || !lockEnabled()) return false;
  if (!hasStoredSession()) return false;
  const last = Number(window.localStorage.getItem(LAST_ACTIVE) || 0);
  return !last || Date.now() - last > getRelockMs();
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
