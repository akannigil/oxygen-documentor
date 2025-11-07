/** @type {import('next').NextConfig} */
const nextConfig = {
  // Activer le mode standalone pour Docker (optimisation de la taille)
  output: 'standalone',

  // Ignorer les erreurs ESLint lors du build
  eslint: {
    ignoreDuringBuilds: true,
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
    // Optimiser le cache webpack pour éviter les warnings de sérialisation de grandes chaînes
    config.cache = {
      type: 'memory',
    }

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
      // Liste des modules Node.js natifs à externaliser
      // Note: 'buffer' n'est PAS externalisé car il doit être disponible comme polyfill
      // pour les middlewares et Edge Runtime
      const nodeBuiltins = new Set([
        'child_process',
        'fs',
        'fs/promises',
        'path',
        'os',
        'util',
        'crypto',
        'stream',
        'events',
        'http',
        'https',
        'net',
        'tls',
        'dns',
        'zlib',
        'worker_threads',
        'module',
        'process',
      ])

      // Préserver la configuration externals existante de Next.js
      const originalExternals = config.externals

      // Fonction pour détecter les modules Node.js natifs (doit être appelée en premier)
      const nodeExternalsFn = ({ request }, callback) => {
        // Gérer les imports avec le préfixe "node:" (ex: node:child_process)
        let moduleName = request
        if (request && request.startsWith('node:')) {
          moduleName = request.substring(5) // Enlever le préfixe "node:"
        }

        if (nodeBuiltins.has(moduleName)) {
          // Retourner le nom sans le préfixe "node:" pour compatibilité
          return callback(null, `commonjs ${moduleName}`)
        }

        // Si originalExternals est une fonction, l'appeler
        if (typeof originalExternals === 'function') {
          return originalExternals({ request }, callback)
        }
        // Sinon, continuer normalement
        callback()
      }

      // Configurer les externals - mettre nodeExternalsFn en premier pour qu'il soit appelé en premier
      // Externaliser puppeteer et ses dépendances pour éviter les problèmes avec node:
      // Externaliser BullMQ pour éviter les warnings Webpack sur les dépendances dynamiques
      if (Array.isArray(originalExternals)) {
        config.externals = [
          nodeExternalsFn,
          ...originalExternals,
          'canvas',
          'konva',
          'puppeteer',
          '@puppeteer/browsers',
          'bullmq',
          'ioredis',
        ]
      } else if (typeof originalExternals === 'function') {
        config.externals = [
          nodeExternalsFn,
          originalExternals,
          'canvas',
          'konva',
          'puppeteer',
          '@puppeteer/browsers',
          'bullmq',
          'ioredis',
        ]
      } else {
        config.externals = [
          nodeExternalsFn,
          'canvas',
          'konva',
          'puppeteer',
          '@puppeteer/browsers',
          'bullmq',
          'ioredis',
        ]
      }

      // Ajouter un alias pour résoudre les imports "node:" vers les modules natifs
      config.resolve.alias = {
        ...config.resolve.alias,
      }

      // Créer des alias pour chaque module node: vers le module sans préfixe
      nodeBuiltins.forEach((module) => {
        config.resolve.alias[`node:${module}`] = module
      })
    }

    // Pour l'instrumentation : gérer les imports node: (ex: node:process de puppeteer)
    // Ajouter des alias pour tous les modules node:
    if (!config.resolve.alias) {
      config.resolve.alias = {}
    }

    // Liste des modules node: pour les alias (buffer inclus pour les alias, mais pas externalisé)
    const allNodeBuiltins = [
      'child_process',
      'fs',
      'fs/promises',
      'path',
      'os',
      'util',
      'crypto',
      'stream',
      'buffer', // Alias uniquement, pas externalisé
      'events',
      'http',
      'https',
      'net',
      'tls',
      'dns',
      'zlib',
      'worker_threads',
      'module',
      'process',
    ]

    allNodeBuiltins.forEach((mod) => {
      config.resolve.alias[`node:${mod}`] = mod
    })

    return config
  },
}

module.exports = nextConfig
