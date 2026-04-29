/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removing headers to rule out config-based CSP issues
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3005/api/:path*',
      },
    ];
  },
};

export default nextConfig;
