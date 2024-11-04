const BASE_SERVER_PATH = "https://apps.themoondevs.com";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.prismic.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "flagcdn.com",
        pathname: "/**",
      }
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          // does not add /docs since basePath: false is set
          source: "/birthdaybook/:path*",
          destination: BASE_SERVER_PATH + "/birthdaybook/:path*",
          basePath: false,
        },
      ],
    };
  },
  async redirects() {
    return [
      // {
      //   // does not add /docs since basePath: false is set
      //   source: '/birthdaybook/:path*',
      //   destination: BASE_SERVER_PATH + '/birthdaybook/:path*',
      //   basePath: false,
      //   permanent: true,
      // },
      {
        // does not add /docs since basePath: false is set
        source: "/atom_api/:path*",
        destination: BASE_SERVER_PATH + "/atom_api/:path*",
        basePath: false,
        permanent: true,
      },
      {
        // does not add /docs since basePath: false is set
        source: "/sense_api/:path*",
        destination: BASE_SERVER_PATH + "/sense_api/:path*",
        basePath: false,
        permanent: true,
      },
      {
        // does not add /docs since basePath: false is set
        source: "/contracts/:path*",
        destination: BASE_SERVER_PATH + "/contracts/:path*",
        basePath: false,
        permanent: true,
      },
      {
        // does not add /docs since basePath: false is set
        source: "/games/:path*",
        destination: BASE_SERVER_PATH + "/games/:path*",
        basePath: false,
        permanent: true,
      },
      {
        // does not add /docs since basePath: false is set
        source: "/app-birthdaybook/:path*",
        destination: BASE_SERVER_PATH + "/app-birthdaybook/:path*",
        basePath: false,
        permanent: true,
      },
      {
        // does not add /docs since basePath: false is set
        source: "/senseapp/:path*",
        destination: BASE_SERVER_PATH + "/senseapp/:path*",
        basePath: false,
        permanent: true,
      },
      {
        // does not add /docs since basePath: false is set
        source: "/helloqr/:path*",
        destination: BASE_SERVER_PATH + "/helloqr/:path*",
        basePath: false,
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
