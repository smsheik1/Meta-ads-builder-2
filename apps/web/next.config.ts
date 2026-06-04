import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    '@remotion/bundler',
    '@remotion/renderer',
    'esbuild',
  ],
};

export default nextConfig;
