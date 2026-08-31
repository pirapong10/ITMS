/** @type {import('next').NextConfig} */
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL_ENV;
const isDockerBuild = process.env.BUILD_STANDALONE === 'true' || process.env.DOCKER_BUILD === 'true';

const nextConfig = {
  // Only use standalone output when explicitly building for Docker/Self-hosted (NOT on Vercel)
  ...(!isVercel && isDockerBuild ? { output: 'standalone' } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
