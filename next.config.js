const runtimeCaching = require("next-pwa/cache");
const withPWA = require("next-pwa")({
  //dest: "public",
  //reactStrictMode: true,
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
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
  experimental: {
    //looseMode: true,
    esmExternals: "loose", // <-- add this
    serverComponentsExternalPackages: ["mongoose"], // <-- and this
  },
  webpack: (config) => {
    config.experiments = {
      topLevelAwait: true,
      layers: true,
    };
    return config;
  },
  images: {
    domains: ["lh3.googleusercontent.com"],
  },
};

module.exports = withPWA(nextConfig);
