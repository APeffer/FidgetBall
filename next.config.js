/** @type {import('next').NextConfig} */
const nextConfig = {
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'accelerometer=*, gyroscope=*',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://warpcast.com https://client.warpcast.com https://farcaster.xyz https://client.farcaster.xyz;",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig 