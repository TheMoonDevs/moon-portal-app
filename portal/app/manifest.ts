import type { MetadataRoute } from 'next';

// Served at /manifest.webmanifest; Next links it from every page.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Portal',
    short_name: 'Portal',
    description:
      'Worklogs, projects and progress for every company you work with.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#0a0a0b',
    background_color: '#0a0a0b',
    icons: [
      ...[192, 256, 384, 512].map((size) => ({
        src: `/icon-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: 'image/png',
        purpose: 'any' as const,
      })),
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
