import type { MetadataRoute } from 'next';

// Installable-app metadata. Serves two purposes: it makes Fornello a proper
// home-screen app on iOS today, and it is the same metadata the Capacitor
// shell will carry into the App Store build later — so tuning name, colours,
// and icons here is not throwaway work.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fornello — Family Meal Planner',
    short_name: 'Fornello',
    description: 'Weekly dinner planning, heirloom recipes, and grocery lists for your family.',
    start_url: '/',
    // 'standalone' drops Safari's chrome so the home-screen launch looks like
    // an app rather than a bookmark.
    display: 'standalone',
    orientation: 'portrait',
    // Matches the warm parchment of the page backgrounds, so the launch screen
    // and status bar don't flash white against the app's palette.
    background_color: '#F7F4EE',
    theme_color: '#F7F4EE',
    categories: ['food', 'lifestyle', 'productivity'],
    icons: [
      { src: '/icons/app/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/app/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // iOS ignores `maskable`, but Android crops non-maskable icons into a
      // circle; declaring it keeps the logo from being clipped there.
      { src: '/icons/app/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
