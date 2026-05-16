import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['irritably-superjet-frayed.ngrok-free.dev', '*.ngrok-free.dev'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:3001/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
