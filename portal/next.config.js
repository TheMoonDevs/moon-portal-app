const runtimeCaching = require("next-pwa/cache");
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const withPWA = require("next-pwa")({
  //dest: "public",
  //reactStrictMode: true,
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV !== "production",
  skipWaiting: false,
  clientsClaim: false,
  runtimeCaching,
  buildExcludes: [
    /middleware-manifest.json$/,
    /app-build-manifest.json$/,
    /build-manifest.json$/,
  ],
  runtimeCaching,

  // cacheOnFrontEndNav: true,
  // aggressiveFrontEndNavCaching: true,
  // reloadOnOnline: true,
  // swcMinify: true,
  // workboxOptions: {
  //     disableDevLogs: true,
  // },
  // ... other options you like
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

module.exports = withBundleAnalyzer(withPWA(nextConfig));
