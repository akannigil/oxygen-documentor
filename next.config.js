/** @type {import('next').NextConfig} */
const nextConfig = {
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
    // Exclure le module 'canvas' du bundling client
    // Konva utilise 'canvas' uniquement côté serveur (via index-node.js)
    // Côté client, Konva utilise directement le Canvas HTML5 du navigateur
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      }
    }
    return config
  },
}

module.exports = nextConfig

