const runtimeCaching = require("next-pwa/cache");
const withPWA = require("next-pwa")({
  //dest: "public",
  //reactStrictMode: true,
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  skipWaiting: true,
  runtimeCaching,
  buildExcludes: [/middleware-manifest.json$/],

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
  experimental: {
    //looseMode: true,
    esmExternals: "loose", // <-- add this
    serverComponentsExternalPackages: ["mongoose"], // <-- and this
  },
  webpack: (config, { isServer }) => {
    // Experiments configuration
    config.experiments = {
      topLevelAwait: true,
      layers: true,
    };

    return config;
  },
};

module.exports = withPWA(nextConfig);
