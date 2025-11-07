import { S3Client, HeadBucketCommand, CreateBucketCommand, PutBucketCorsCommand, ListBucketsCommand } from '@aws-sdk/client-s3'
import type { S3StorageConfig } from './config'

export interface ConnectionTestResult {
  success: boolean
  message: string
  details?: {
    endpointReachable?: boolean
    bucketExists?: boolean
    bucketCreated?: boolean
    hasAccess?: boolean
    region?: string
    endpoint?: string
  }
  error?: string
}

/**
 * Teste la connexion à un service S3/MinIO
 */
export async function testS3Connection(config: S3StorageConfig): Promise<ConnectionTestResult> {
  try {
    // Validation des paramètres requis
    if (!config.bucket) {
      return {
        success: false,
        message: 'Le nom du bucket est requis',
        error: 'MISSING_BUCKET'
      }
    }

    if (!config.region) {
      return {
        success: false,
        message: 'La région est requise',
        error: 'MISSING_REGION'
      }
    }

    // Configuration du client S3
    const clientConfig: any = {
      region: config.region,
      // Pour MinIO et services compatibles, forcer le path-style
      forcePathStyle: config.forcePathStyle ?? true,
    }

    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint
    }

    if (config.accessKeyId && config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      }
    }

    const client = new S3Client(clientConfig)

    // Étape 1 : Tester si on peut lister les buckets (test de connexion)
    try {
      await client.send(new ListBucketsCommand({}))
    } catch (error: any) {
      if (error.name === 'CredentialsProviderError' || error.Code === 'InvalidAccessKeyId') {
        return {
          success: false,
          message: 'Les identifiants (Access Key ID / Secret Key) sont invalides',
          error: 'INVALID_CREDENTIALS',
          details: {
            ...(config.endpoint ? { endpoint: config.endpoint } : {}),
            region: config.region,
          }
        }
      }
      
      if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
        return {
          success: false,
          message: `Impossible de résoudre l'endpoint : ${config.endpoint || 'AWS S3'}`,
          error: 'ENDPOINT_NOT_FOUND',
          details: {
            ...(config.endpoint ? { endpoint: config.endpoint } : {}),
            endpointReachable: false,
          }
        }
      }

      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: `Connexion refusée par le serveur : ${config.endpoint || 'AWS S3'}`,
          error: 'CONNECTION_REFUSED',
          details: {
            ...(config.endpoint ? { endpoint: config.endpoint } : {}),
            endpointReachable: false,
          }
        }
      }

      // Autre erreur de connexion
      throw error
    }

    // Étape 2 : Vérifier si le bucket existe
    let bucketExists = false
    try {
      await client.send(new HeadBucketCommand({ Bucket: config.bucket }))
      bucketExists = true
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        bucketExists = false
      } else {
        // Erreur inattendue
        throw error
      }
    }

    // Étape 3 : Si le bucket n'existe pas, le créer
    let bucketCreated = false
    if (!bucketExists) {
      try {
        await client.send(new CreateBucketCommand({ Bucket: config.bucket }))
        bucketCreated = true

        // Configurer CORS pour le bucket (optionnel mais recommandé)
        try {
          await client.send(new PutBucketCorsCommand({
            Bucket: config.bucket,
            CORSConfiguration: {
              CORSRules: [
                {
                  AllowedHeaders: ['*'],
                  AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                  AllowedOrigins: ['*'],
                  ExposeHeaders: ['ETag'],
                  MaxAgeSeconds: 3000,
                },
              ],
            },
          }))
        } catch (corsError) {
          // Ignorer les erreurs CORS (certains services ne le supportent pas)
          console.warn('Impossible de configurer CORS:', corsError)
        }
      } catch (error: any) {
        if (error.name === 'BucketAlreadyOwnedByYou') {
          // Le bucket existe déjà (race condition)
          bucketExists = true
        } else if (error.name === 'BucketAlreadyExists') {
          return {
            success: false,
            message: `Le bucket "${config.bucket}" existe déjà et appartient à un autre utilisateur`,
            error: 'BUCKET_ALREADY_EXISTS',
            details: {
              endpointReachable: true,
              bucketExists: false,
              region: config.region,
            }
          }
        } else {
          throw error
        }
      }
    }

    // Succès !
    return {
      success: true,
      message: bucketCreated
        ? `Connexion réussie ! Le bucket "${config.bucket}" a été créé automatiquement.`
        : `Connexion réussie ! Le bucket "${config.bucket}" est accessible.`,
      details: {
        endpointReachable: true,
        bucketExists: !bucketCreated,
        bucketCreated,
        hasAccess: true,
        region: config.region,
        ...(config.endpoint ? { endpoint: config.endpoint } : {}),
      }
    }

  } catch (error: any) {
    console.error('Erreur lors du test de connexion S3:', error)
    
    return {
      success: false,
      message: `Erreur inattendue : ${error.message || 'Erreur inconnue'}`,
      error: error.code || error.name || 'UNKNOWN_ERROR',
      details: {
        ...(config.endpoint ? { endpoint: config.endpoint } : {}),
        region: config.region,
      }
    }
  }
}

/**
 * Teste la connexion avec la configuration globale (variables d'environnement)
 */
export async function testDefaultS3Connection(): Promise<ConnectionTestResult> {
  const accessKeyId = process.env['AWS_ACCESS_KEY_ID']
  const secretAccessKey = process.env['AWS_SECRET_ACCESS_KEY']
  const endpoint = process.env['S3_ENDPOINT'] || process.env['MINIO_ENDPOINT']
  
  const config: S3StorageConfig = {
    type: 's3',
    bucket: process.env['S3_BUCKET_NAME'] || process.env['AWS_S3_BUCKET'] || '',
    region: process.env['AWS_REGION'] || 'us-east-1',
    ...(accessKeyId ? { accessKeyId } : {}),
    ...(secretAccessKey ? { secretAccessKey } : {}),
    ...(endpoint ? { endpoint } : {}),
    forcePathStyle: process.env['S3_FORCE_PATH_STYLE'] === 'true' || 
                    process.env['MINIO_FORCE_PATH_STYLE'] === 'true' ||
                    !!(process.env['S3_ENDPOINT'] || process.env['MINIO_ENDPOINT']),
  }

  if (!config.bucket) {
    return {
      success: false,
      message: 'Aucun bucket configuré dans les variables d\'environnement (S3_BUCKET_NAME)',
      error: 'MISSING_BUCKET'
    }
  }

  return testS3Connection(config)
}

