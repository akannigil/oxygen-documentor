/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.s3.*.amazonaws.com',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Configuration spécifique pour Konva/React-Konva
    if (!isServer) {
      // Exclure canvas du bundling côté client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
      }
    } else {
      // Côté serveur, exclure Konva complètement
      config.externals = [...(config.externals || []), 'canvas', 'konva']
    }

    return config
  },
}

module.exports = nextConfig

