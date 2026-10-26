import bundleAnalyzer from '@next/bundle-analyzer';
import withSerwistInit from '@serwist/next';
import { randomUUID } from 'node:crypto';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

// Service worker (offline support + push notifications), built from app/sw.ts.
// It updates itself silently on every deploy (no "new version" popup).
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // The page shown when there's no connection (app/~offline/page.tsx).
  additionalPrecacheEntries: [
    {
      url: "/~offline",
      revision: process.env.VERCEL_GIT_COMMIT_SHA || randomUUID(),
    },
  ],
  // We register it ourselves in components/global/ServiceWorkerProvider.tsx.
  register: false,
  // Don't reload the page whenever the browser comes back online.
  reloadOnOnline: false,
  disable: process.env.NODE_ENV !== "production",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  output: "standalone",
  // The approval screen for AI assistants must never be framed.
  async headers() {
    return [
      {
        // Browsers must always check for a fresh service worker.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/oauth/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ];
  },
  // OAuth discovery for AI assistants connecting to /api/mcp.
  async rewrites() {
    return [
      {
        source: "/.well-known/oauth-authorization-server",
        destination: "/api/oauth/metadata",
      },
      {
        source: "/.well-known/oauth-authorization-server/:path*",
        destination: "/api/oauth/metadata",
      },
      {
        source: "/.well-known/oauth-protected-resource",
        destination: "/api/oauth/resource",
      },
      {
        source: "/.well-known/oauth-protected-resource/:path*",
        destination: "/api/oauth/resource",
      },
    ];
  },
  swcMinify: true,
  productionBrowserSourceMaps: false,
  experimental: {
    serverSourceMaps: false,
    //looseMode: true,
    esmExternals: "loose", // <-- add this
    optimizePackageImports: ['@mantine/core', '@mantine/styles', '@mantine/utils'],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    // ignoreBuildErrors: true,
  },
  webpack: (
    config,
    { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }
  ) => {
    config.experiments = {
      topLevelAwait: true,
      layers: true,
    };
    // if (config.cache && !dev) {
    //   config.cache = Object.freeze({
    //     type: 'memory',
    //   })
    // }
    return config
  },
};

export default withBundleAnalyzer(withSerwist(nextConfig));
