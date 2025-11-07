'use client'

import { useState, useEffect } from 'react'
import type { StorageConfig, StorageType } from '@/lib/storage/config'

interface StorageConfigFormProps {
  projectId: string
  initialConfig?: StorageConfig | null | undefined
  onSave?: (config: StorageConfig | null) => void
}

export function StorageConfigForm({ projectId, initialConfig, onSave }: StorageConfigFormProps) {
  const [storageType, setStorageType] = useState<StorageType>(initialConfig?.type || 'local')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Configuration S3
  const [s3Bucket, setS3Bucket] = useState('')
  const [s3Region, setS3Region] = useState('us-east-1')
  const [s3AccessKeyId, setS3AccessKeyId] = useState('')
  const [s3SecretAccessKey, setS3SecretAccessKey] = useState('')
  const [s3Endpoint, setS3Endpoint] = useState('')
  const [s3ForcePathStyle, setS3ForcePathStyle] = useState(false)

  // Auto-détection si c'est MinIO ou autre service compatible S3
  const isMinioOrCompatible =
    s3Endpoint && !s3Endpoint.includes('amazonaws.com') && s3Endpoint.trim() !== ''

  // Configuration Local
  const [localBaseDir, setLocalBaseDir] = useState('./uploads')

  // Configuration FTP
  const [ftpHost, setFtpHost] = useState('')
  const [ftpUser, setFtpUser] = useState('')
  const [ftpPassword, setFtpPassword] = useState('')
  const [ftpPort, setFtpPort] = useState('21')
  const [ftpSecure, setFtpSecure] = useState(false)
  const [ftpBasePath, setFtpBasePath] = useState('')

  // Configuration Google Drive
  const [gdFolderId, setGdFolderId] = useState('')
  const [gdClientId, setGdClientId] = useState('')
  const [gdClientSecret, setGdClientSecret] = useState('')
  const [gdRefreshToken, setGdRefreshToken] = useState('')

  // Charger la configuration initiale
  useEffect(() => {
    if (initialConfig) {
      setStorageType(initialConfig.type)

      if (initialConfig.type === 's3') {
        const cfg = initialConfig as import('@/lib/storage/config').S3StorageConfig
        setS3Bucket(cfg.bucket || '')
        setS3Region(cfg.region || 'us-east-1')
        setS3AccessKeyId(cfg.accessKeyId || '')
        setS3SecretAccessKey(cfg.secretAccessKey || '')
        setS3Endpoint(cfg.endpoint || '')
        setS3ForcePathStyle(cfg.forcePathStyle || false)
      } else if (initialConfig.type === 'local') {
        const cfg = initialConfig as import('@/lib/storage/config').LocalStorageConfig
        setLocalBaseDir(cfg.baseDir || './uploads')
      } else if (initialConfig.type === 'ftp') {
        const cfg = initialConfig as import('@/lib/storage/config').FTPStorageConfig
        setFtpHost(cfg.host || '')
        setFtpUser(cfg.user || '')
        setFtpPassword(cfg.password || '')
        setFtpPort(String(cfg.port || 21))
        setFtpSecure(cfg.secure || false)
        setFtpBasePath(cfg.basePath || '')
      } else if (initialConfig.type === 'google-drive') {
        const cfg = initialConfig as import('@/lib/storage/config').GoogleDriveStorageConfig
        setGdFolderId(cfg.folderId || '')
        setGdClientId(cfg.credentials?.clientId || '')
        setGdClientSecret(cfg.credentials?.clientSecret || '')
        setGdRefreshToken(cfg.credentials?.refreshToken || '')
      }
    }
  }, [initialConfig])

  const buildConfig = (): StorageConfig | null => {
    switch (storageType) {
      case 'local':
        return {
          type: 'local',
          ...(localBaseDir ? { baseDir: localBaseDir } : {}),
        }

      case 's3':
        if (!s3Bucket || !s3Region) {
          throw new Error('Le bucket et la région sont requis pour S3')
        }
        return {
          type: 's3',
          bucket: s3Bucket,
          region: s3Region,
          ...(s3AccessKeyId ? { accessKeyId: s3AccessKeyId } : {}),
          ...(s3SecretAccessKey ? { secretAccessKey: s3SecretAccessKey } : {}),
          ...(s3Endpoint ? { endpoint: s3Endpoint } : {}),
          ...(s3ForcePathStyle ? { forcePathStyle: s3ForcePathStyle } : {}),
        }

      case 'ftp':
        if (!ftpHost || !ftpUser || !ftpPassword) {
          throw new Error('L\'hôte, l\'utilisateur et le mot de passe sont requis pour FTP')
        }
        return {
          type: 'ftp',
          host: ftpHost,
          user: ftpUser,
          password: ftpPassword,
          ...(ftpSecure ? { secure: ftpSecure } : {}),
          ...(ftpPort ? { port: parseInt(ftpPort, 10) } : {}),
          ...(ftpBasePath ? { basePath: ftpBasePath } : {}),
        }

      case 'google-drive':
        return {
          type: 'google-drive',
          ...(gdFolderId ? { folderId: gdFolderId } : {}),
          credentials: {
            ...(gdClientId ? { clientId: gdClientId } : {}),
            ...(gdClientSecret ? { clientSecret: gdClientSecret } : {}),
            ...(gdRefreshToken ? { refreshToken: gdRefreshToken } : {}),
          },
        }

      default:
        return null
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      // Validation spécifique pour S3/MinIO
      if (storageType === 's3') {
        if (!s3Bucket.trim()) {
          throw new Error('Le nom du bucket est requis')
        }
        if (!s3Region.trim()) {
          throw new Error('La région est requise')
        }
        if (s3Endpoint && !/^https?:\/\/.+/.test(s3Endpoint.trim())) {
          throw new Error("L'endpoint doit commencer par http:// ou https://")
        }
        // Avertir si MinIO sans forcePathStyle
        if (isMinioOrCompatible && !s3ForcePathStyle) {
          const confirmWithoutPathStyle = window.confirm(
            'Vous utilisez un endpoint personnalisé (MinIO/compatible S3) sans activer "Forcer le style de chemin".\n\n' +
              'Cela peut causer des erreurs de connexion. Voulez-vous continuer quand même ?'
          )
          if (!confirmWithoutPathStyle) {
            setIsSaving(false)
            return
          }
        }
      }

      const config = buildConfig()

      const response = await fetch(`/api/projects/${projectId}/storage-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la sauvegarde')
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

      if (onSave) {
        onSave(config)
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg
            className="h-5 w-5 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
            />
          </svg>
          Configuration du stockage des fichiers générés
        </h3>

        {/* Sélection du type de stockage */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type de stockage
          </label>
          <select
            value={storageType}
            onChange={(e) => setStorageType(e.target.value as StorageType)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="local">Local (fichiers sur le serveur)</option>
            <option value="s3">AWS S3 / MinIO / Cloudflare R2</option>
            <option value="ftp">FTP / FTPS</option>
            <option value="google-drive">Google Drive (à venir)</option>
          </select>
        </div>

        {/* Configuration Local */}
        {storageType === 'local' && (
          <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Répertoire de base
              </label>
              <input
                type="text"
                value={localBaseDir}
                onChange={(e) => setLocalBaseDir(e.target.value)}
                placeholder="./uploads"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Chemin relatif ou absolu où seront stockés les fichiers
              </p>
            </div>
          </div>
        )}

        {/* Configuration S3 */}
        {storageType === 's3' && (
          <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du bucket <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={s3Bucket}
                onChange={(e) => setS3Bucket(e.target.value)}
                placeholder="mon-bucket"
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Région <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={s3Region}
                onChange={(e) => setS3Region(e.target.value)}
                placeholder="us-east-1"
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Access Key ID
              </label>
              <input
                type="text"
                value={s3AccessKeyId}
                onChange={(e) => setS3AccessKeyId(e.target.value)}
                placeholder="AKIAIOSFODNN7EXAMPLE"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secret Access Key
              </label>
              <input
                type="password"
                value={s3SecretAccessKey}
                onChange={(e) => setS3SecretAccessKey(e.target.value)}
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endpoint (optionnel, pour MinIO, R2, etc.)
              </label>
              <input
                type="text"
                value={s3Endpoint}
                onChange={(e) => setS3Endpoint(e.target.value)}
                placeholder="https://s3.example.com"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Laissez vide pour AWS S3 standard. Pour MinIO, indiquez l&apos;URL complète (ex:{' '}
                <code>https://s3.mondomaine.com</code>)
              </p>
            </div>

            {/* Avertissement pour MinIO */}
            {isMinioOrCompatible && (
              <div className="rounded-md bg-amber-50 p-3 border border-amber-200">
                <div className="flex items-start gap-2">
                  <svg
                    className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0"
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
                    <p className="text-sm font-medium text-amber-900">
                      Endpoint personnalisé détecté (MinIO/Compatible S3)
                    </p>
                    <p className="mt-1 text-xs text-amber-800">
                      Il est fortement recommandé d&apos;activer &quot;Forcer le style de
                      chemin&quot; ci-dessous pour assurer la compatibilité.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  id="s3-force-path-style"
                  checked={s3ForcePathStyle}
                  onChange={(e) => setS3ForcePathStyle(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="s3-force-path-style" className="block text-sm font-medium text-gray-700">
                  Forcer le style de chemin (path-style)
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {isMinioOrCompatible ? (
                    <span className="text-amber-700 font-medium">
                      ✓ Recommandé pour MinIO et services compatibles S3
                    </span>
                  ) : (
                    <span>Requis pour MinIO, DigitalOcean Spaces, et autres services compatibles S3</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Configuration FTP */}
        {storageType === 'ftp' && (
          <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hôte <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={ftpHost}
                onChange={(e) => setFtpHost(e.target.value)}
                placeholder="ftp.example.com"
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Utilisateur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ftpUser}
                  onChange={(e) => setFtpUser(e.target.value)}
                  placeholder="username"
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={ftpPassword}
                  onChange={(e) => setFtpPassword(e.target.value)}
                  placeholder="password"
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={ftpPort}
                  onChange={(e) => setFtpPort(e.target.value)}
                  placeholder="21"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="ftp-secure"
                    checked={ftpSecure}
                    onChange={(e) => setFtpSecure(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="ftp-secure" className="ml-2 block text-sm text-gray-700">
                    FTPS (sécurisé)
                  </label>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chemin de base (optionnel)
              </label>
              <input
                type="text"
                value={ftpBasePath}
                onChange={(e) => setFtpBasePath(e.target.value)}
                placeholder="/documents"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Configuration Google Drive */}
        {storageType === 'google-drive' && (
          <div className="space-y-4 p-4 rounded-lg border border-yellow-200 bg-yellow-50">
            <div className="flex items-start gap-2">
              <svg
                className="h-5 w-5 text-yellow-600 mt-0.5"
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
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Google Drive n&apos;est pas encore implémenté
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Cette fonctionnalité sera disponible dans une prochaine version.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Messages d'erreur et de succès */}
        {saveError && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{saveError}</p>
          </div>
        )}

        {saveSuccess && (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">Configuration sauvegardée avec succès !</p>
          </div>
        )}

        {/* Bouton de sauvegarde */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
          </button>
        </div>
      </div>
    </div>
  )
}

