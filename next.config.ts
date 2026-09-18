import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Logos are capped at 1 MB by the brand service; this leaves room for
      // the multipart overhead.
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig
