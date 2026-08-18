import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.fornello.mobile',
  appName: 'Fornello',
  // Where `npm run build:app` leaves the static export. Next 16 exports into
  // distDir directly, so this matches next.config.ts's distDir.
  webDir: 'app-build',
  ios: {
    // The parchment background, so launch and overscroll don't flash white.
    backgroundColor: '#F7F4EE',
    contentInset: 'always',
  },
};

export default config;
