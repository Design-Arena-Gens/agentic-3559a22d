/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: {
    // Lint locally; don't block prod builds
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
