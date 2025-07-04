/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove standalone output for Vercel deployment
  serverExternalPackages: ['bcryptjs'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
