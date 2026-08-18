'use client';
import { useEffect } from 'react';
import { createBrowser } from '@/lib/supabase';
import { installNativeApiBridge } from '@/lib/native';

/**
 * Installs the native API bridge as early as the app mounts.
 *
 * Renders nothing and does nothing on the website — installNativeApiBridge()
 * returns immediately unless it is running inside the Capacitor shell.
 */
export default function NativeBridge() {
  useEffect(() => {
    const supabase = createBrowser();
    installNativeApiBridge(async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    });
  }, []);

  return null;
}
