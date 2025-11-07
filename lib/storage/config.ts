import type { StorageAdapter } from './adapters'
import { S3StorageAdapter, LocalStorageAdapter, FTPStorageAdapter, createStorageAdapter } from './adapters'

/**
 * Types de stockage supportés
 */
export type StorageType = 'local' | 's3' | 'ftp' | 'google-drive'

/**
 * Configuration de base pour tous les types de stockage
 */
export interface BaseStorageConfig {
  type: StorageType
}

/**
 * Configuration pour le stockage local
 */
export interface LocalStorageConfig extends BaseStorageConfig {
  type: 'local'
  baseDir?: string
}

/**
 * Configuration pour S3 (AWS S3, MinIO, Cloudflare R2, etc.)
 */
export interface S3StorageConfig extends BaseStorageConfig {
  type: 's3'
  bucket: string
  region: string
  accessKeyId?: string
  secretAccessKey?: string
  endpoint?: string
  forcePathStyle?: boolean
}

/**
 * Configuration pour FTP
 */
export interface FTPStorageConfig extends BaseStorageConfig {
  type: 'ftp'
  host: string
  user: string
  password: string
  secure?: boolean
  port?: number
  basePath?: string
}

/**
 * Configuration pour Google Drive
 */
export interface GoogleDriveStorageConfig extends BaseStorageConfig {
  type: 'google-drive'
  folderId?: string
  credentials?: {
    clientId?: string
    clientSecret?: string
    refreshToken?: string
  }
}

/**
 * Union de toutes les configurations possibles
 */
export type StorageConfig =
  | LocalStorageConfig
  | S3StorageConfig
  | FTPStorageConfig
  | GoogleDriveStorageConfig

/**
 * Crée un adaptateur de stockage à partir d'une configuration JSON
 */
export function createStorageAdapterFromConfig(config: StorageConfig | null | undefined): StorageAdapter {
  // Si aucune configuration n'est fournie, utiliser la configuration par défaut (variables d'environnement)
  if (!config) {
    return createStorageAdapter()
  }

  switch (config.type) {
    case 'local': {
      const localConfig = config as LocalStorageConfig
      return new LocalStorageAdapter(localConfig.baseDir || './uploads')
    }

    case 's3': {
      const s3Config = config as S3StorageConfig
      if (!s3Config.bucket || !s3Config.region) {
        throw new Error('S3_BUCKET_NAME et AWS_REGION sont requis pour le stockage S3')
      }

      // Normaliser l'URL de l'endpoint (ajouter https:// si manquant)
      let endpoint = s3Config.endpoint
      if (endpoint && !/^https?:\/\//i.test(endpoint)) {
        endpoint = `https://${endpoint}`
      }

      // Détecter si c'est un endpoint AWS S3 standard ou un endpoint personnalisé (MinIO, etc.)
      const isAwsS3Endpoint = endpoint ? /^https?:\/\/s3[.-].*\.amazonaws\.com/i.test(endpoint) : false
      
      // Pour AWS S3 standard, ne pas forcer path-style sauf si explicitement demandé
      // Pour MinIO et autres endpoints personnalisés, forcer path-style par défaut
      const forcePathStyle: boolean = s3Config.forcePathStyle !== undefined
        ? s3Config.forcePathStyle
        : !!(endpoint && !isAwsS3Endpoint)

      const options = {
        ...(endpoint ? { endpoint } : {}),
        forcePathStyle, // Toujours défini, même si false
      }

      return new S3StorageAdapter(
        s3Config.bucket,
        s3Config.region,
        s3Config.accessKeyId,
        s3Config.secretAccessKey,
        options
      )
    }

    case 'ftp': {
      const ftpConfig = config as FTPStorageConfig
      if (!ftpConfig.host || !ftpConfig.user || !ftpConfig.password) {
        throw new Error('FTP_HOST, FTP_USER et FTP_PASSWORD sont requis pour le stockage FTP')
      }

      return new FTPStorageAdapter({
        host: ftpConfig.host,
        user: ftpConfig.user,
        password: ftpConfig.password,
        secure: ftpConfig.secure ?? false,
        ...(ftpConfig.port && { port: ftpConfig.port }),
        ...(ftpConfig.basePath && { basePath: ftpConfig.basePath }),
      })
    }

    case 'google-drive': {
      // Pour l'instant, Google Drive n'est pas encore implémenté
      // On retourne une erreur explicite
      throw new Error(
        'Le stockage Google Drive n\'est pas encore implémenté. Veuillez utiliser S3, FTP ou Local.'
      )
    }

    default:
      throw new Error(`Type de stockage non supporté: ${(config as BaseStorageConfig).type}`)
  }
}

/**
 * Valide une configuration de stockage
 */
export function validateStorageConfig(config: unknown): config is StorageConfig {
  if (!config || typeof config !== 'object') {
    return false
  }

  const cfg = config as Record<string, unknown>

  if (!cfg['type'] || typeof cfg['type'] !== 'string') {
    return false
  }

  const type = cfg['type'] as string

  switch (type) {
    case 'local':
      return true

    case 's3': {
      const bucket = cfg['bucket']
      const region = cfg['region']
      return (
        typeof bucket === 'string' &&
        bucket.length > 0 &&
        typeof region === 'string' &&
        region.length > 0
      )
    }

    case 'ftp': {
      const host = cfg['host']
      const user = cfg['user']
      const password = cfg['password']
      return (
        typeof host === 'string' &&
        host.length > 0 &&
        typeof user === 'string' &&
        user.length > 0 &&
        typeof password === 'string' &&
        password.length > 0
      )
    }

    case 'google-drive':
      return true

    default:
      return false
  }
}

