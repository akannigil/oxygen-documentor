'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { StorageConfig } from '@/lib/storage/config'

interface StorageStatusBannerProps {
  projectId: string
  showDetails?: boolean
}

export function StorageStatusBanner({ projectId, showDetails = false }: StorageStatusBannerProps) {
  const [config, setConfig] = useState<StorageConfig | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/storage-config`)
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération de la configuration')
        }
        const data = await response.json()
        setConfig(data.config)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [projectId])

  if (loading) {
    return null // Ou un skeleton loader
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Erreur de configuration du stockage
            </h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // Pas de configuration = utilise la configuration globale (variables d'environnement)
  if (config === null || config === undefined) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900">
              Configuration de stockage par défaut
            </h3>
            <p className="mt-1 text-sm text-blue-800">
              Ce projet utilise la configuration de stockage par défaut du serveur.{' '}
              {showDetails && (
                <>
                  <br />
                  <span className="text-xs">
                    Les documents générés seront stockés selon les variables d&apos;environnement
                    globales (STORAGE_TYPE, S3_BUCKET_NAME, MINIO_ENDPOINT, etc.).
                  </span>
                </>
              )}
            </p>
            <div className="mt-3">
              <Link
                href={`/projects/${projectId}/settings/storage`}
                className="text-sm font-medium text-blue-700 hover:text-blue-600 underline"
              >
                Configurer un stockage personnalisé →
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Validation de la configuration S3/MinIO
  if (config.type === 's3') {
    const s3Config = config as import('@/lib/storage/config').S3StorageConfig
    const warnings: string[] = []

    if (!s3Config.bucket) {
      warnings.push('Le nom du bucket est manquant')
    }
    if (!s3Config.region) {
      warnings.push('La région est manquante')
    }
    if (s3Config.endpoint && !s3Config.endpoint.startsWith('http')) {
      warnings.push("L'endpoint doit commencer par http:// ou https://")
    }
    // Pour MinIO, recommander forcePathStyle
    if (
      s3Config.endpoint &&
      !s3Config.endpoint.includes('amazonaws.com') &&
      !s3Config.forcePathStyle
    ) {
      warnings.push(
        'Pour MinIO/S3 compatible, il est recommandé d\'activer "Forcer le style de chemin"'
      )
    }

    if (warnings.length > 0) {
      return (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-900">
                Configuration de stockage incomplète
              </h3>
              <ul className="mt-2 text-sm text-yellow-800 list-disc list-inside space-y-1">
                {warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
              <div className="mt-3">
                <Link
                  href={`/projects/${projectId}/settings/storage`}
                  className="text-sm font-medium text-yellow-700 hover:text-yellow-600 underline"
                >
                  Corriger la configuration →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Configuration S3 valide
    return showDetails ? (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-900">Stockage S3 configuré</h3>
            <p className="mt-1 text-sm text-green-800">
              Bucket : <code className="font-mono text-xs">{s3Config.bucket}</code>
              {s3Config.endpoint && (
                <>
                  {' '}
                  • Endpoint : <code className="font-mono text-xs">{s3Config.endpoint}</code>
                </>
              )}
            </p>
            <div className="mt-2">
              <Link
                href={`/projects/${projectId}/settings/storage`}
                className="text-sm font-medium text-green-700 hover:text-green-600 underline"
              >
                Modifier la configuration →
              </Link>
            </div>
          </div>
        </div>
      </div>
    ) : null
  }

  // Configuration FTP
  if (config.type === 'ftp') {
    const ftpConfig = config as import('@/lib/storage/config').FTPStorageConfig
    if (!ftpConfig.host || !ftpConfig.user || !ftpConfig.password) {
      return (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-900">Configuration FTP incomplète</h3>
              <p className="mt-1 text-sm text-yellow-800">
                Les identifiants FTP sont incomplets. Vérifiez la configuration.
              </p>
              <div className="mt-3">
                <Link
                  href={`/projects/${projectId}/settings/storage`}
                  className="text-sm font-medium text-yellow-700 hover:text-yellow-600 underline"
                >
                  Corriger la configuration →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return showDetails ? (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-900">Stockage FTP configuré</h3>
            <p className="mt-1 text-sm text-green-800">
              Hôte : <code className="font-mono text-xs">{ftpConfig.host}</code>
            </p>
            <div className="mt-2">
              <Link
                href={`/projects/${projectId}/settings/storage`}
                className="text-sm font-medium text-green-700 hover:text-green-600 underline"
              >
                Modifier la configuration →
              </Link>
            </div>
          </div>
        </div>
      </div>
    ) : null
  }

  // Configuration locale
  if (config.type === 'local') {
    return showDetails ? (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">Stockage local</h3>
            <p className="mt-1 text-sm text-gray-700">
              Les fichiers sont stockés sur le serveur.
            </p>
            <div className="mt-2">
              <Link
                href={`/projects/${projectId}/settings/storage`}
                className="text-sm font-medium text-gray-700 hover:text-gray-600 underline"
              >
                Modifier la configuration →
              </Link>
            </div>
          </div>
        </div>
      </div>
    ) : null
  }

  return null
}

