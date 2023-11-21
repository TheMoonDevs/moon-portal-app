const runtimeCaching = require("next-pwa/cache");
const withPWA = require("@ducanh2912/next-pwa").default({
    //dest: "public",
    dest: "public",
    register: true,
    skipWaiting: false,
    runtimeCaching,
    // cacheOnFrontEndNav: true,
    // aggressiveFrontEndNavCaching: true,
    // reloadOnOnline: true,
    // swcMinify: true,
    disable: process.env.NODE_ENV === "development",
    // workboxOptions: {
    //     disableDevLogs: true,
    // },
    // ... other options you like
});

/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = withPWA(nextConfig)
