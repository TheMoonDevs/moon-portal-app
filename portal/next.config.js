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
  distDir: `build/${process.env.NEXT_PUBLIC_BUILD_PATH || "prod/main"}`,
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
    if (config.cache && !dev) {
      config.cache = Object.freeze({
        type: 'memory',
      })
    }
    return config
  },
};

module.exports = withBundleAnalyzer(withPWA(nextConfig));
