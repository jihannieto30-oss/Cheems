/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: import.meta.dirname,
  transpilePackages: ['three'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
