import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Client } from 'basic-ftp'

export interface StorageAdapter {
  upload(buffer: Buffer, key: string, contentType: string): Promise<string>
  getUrl(key: string): Promise<string>
  getSignedUrl(key: string, expiresIn?: number): Promise<string>
  getBuffer(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  if (!stream) return Buffer.alloc(0)
  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk: Buffer) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', (err: Error) => reject(err))
  })
}

/**
 * Construit une URL absolue à partir d'un chemin relatif en le préfixant avec NEXTAUTH_URL
 * Si l'entrée est déjà absolue (http/https), elle est retournée telle quelle.
 */
function buildAbsoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const base = process.env['NEXTAUTH_URL']
  if (!base) return pathOrUrl
  const baseTrimmed = base.endsWith('/') ? base.slice(0, -1) : base
  const pathTrimmed = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${baseTrimmed}${pathTrimmed}`
}

/**
 * Adaptateur de stockage utilisant AWS S3
 */
export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client
  private bucket: string
  private region: string
  private endpoint: string | undefined
  private forcePathStyle: boolean
  private credentials: { accessKeyId: string; secretAccessKey: string } | undefined

  constructor(
    bucket: string,
    region: string,
    accessKeyId?: string,
    secretAccessKey?: string,
    options?: { endpoint?: string; forcePathStyle?: boolean }
  ) {
    this.bucket = bucket
    this.region = region
    this.endpoint = options?.endpoint
    
    // TOUJOURS utiliser path-style (compatible AWS S3 et MinIO)
    // Le path-style fonctionne pour AWS S3 ET MinIO, donc on l'utilise par défaut
    this.forcePathStyle = true

    // Log pour déboguer en développement
    if (process.env['NODE_ENV'] === 'development') {
      console.log('[S3 Storage] Configuration:')
      console.log(`  - Bucket: ${this.bucket}`)
      console.log(`  - Region: ${this.region}`)
      console.log(`  - Endpoint: ${this.endpoint || 'default AWS'}`)
      console.log(`  - forcePathStyle: ${this.forcePathStyle} (toujours activé pour compatibilité)`)
      console.log(`  - Access Key ID: ${accessKeyId ? `${accessKeyId.substring(0, 8)}...` : 'non défini'}`)
      console.log(`  - Secret Access Key: ${secretAccessKey ? '***défini***' : 'non défini'}`)
    }

    const clientConfig: any = { 
      region: this.region,
      forcePathStyle: true, // Toujours activer path-style
    }
    
    if (this.endpoint) {
      clientConfig.endpoint = this.endpoint
    }
    
    if (accessKeyId && secretAccessKey) {
      this.credentials = { accessKeyId, secretAccessKey }
      clientConfig.credentials = this.credentials
    }
    
    this.client = new S3Client(clientConfig)
  }

  async upload(buffer: Buffer, key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })

    await this.client.send(command)
    return key
  }

  async getUrl(key: string): Promise<string> {
    // TOUJOURS utiliser path-style (compatible AWS S3 et MinIO)
    // Format: endpoint/bucket/key ou s3.region.amazonaws.com/bucket/key
    if (this.endpoint) {
      const endpointBase = this.endpoint.replace(/\/$/, '')
      const url = `${endpointBase}/${this.bucket}/${key}`
      if (process.env['NODE_ENV'] === 'development') {
        console.log(`[S3 Storage] getUrl (path-style): ${url}`)
      }
      return url
    }
    
    // Pour AWS S3 standard, utiliser path-style
    return `https://s3.${this.region}.amazonaws.com/${this.bucket}/${key}`
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // Vérifier que les credentials sont définis
    if (!this.credentials) {
      throw new Error(
        'Les credentials S3 ne sont pas définis. ' +
        'Veuillez fournir accessKeyId et secretAccessKey lors de la création du S3StorageAdapter.'
      )
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    // Le client principal a toujours forcePathStyle=true configuré
    // Utiliser directement ce client pour générer l'URL signée en path-style
    const signedUrl = await getSignedUrl(this.client, command, { expiresIn })
    
    if (process.env['NODE_ENV'] === 'development') {
      console.log(`[S3 Storage] getSignedUrl (path-style): ${signedUrl}`)
      
      // Extraire l'Access Key ID de l'URL signée pour vérification
      try {
        const urlObj = new URL(signedUrl)
        const credentialParam = urlObj.searchParams.get('X-Amz-Credential')
        if (credentialParam) {
          const accessKeyIdFromUrl = credentialParam.split('/')[0]
          if (accessKeyIdFromUrl) {
            console.log(`[S3 Storage] Access Key ID utilisé dans l'URL: ${accessKeyIdFromUrl.substring(0, 8)}...`)
            console.log(`[S3 Storage] Access Key ID configuré: ${this.credentials.accessKeyId.substring(0, 8)}...`)
            
            if (accessKeyIdFromUrl !== this.credentials.accessKeyId) {
              console.warn(
                `[S3 Storage] ⚠️ L'Access Key ID dans l'URL ne correspond pas aux credentials configurés! ` +
                `Cela peut indiquer un problème de configuration du client S3.`
              )
            }
          }
        }
      } catch (error) {
        // Ignorer les erreurs de parsing
      }
      
      // Vérifier que l'URL générée est bien en path-style
      const urlObj = new URL(signedUrl)
      const pathParts = urlObj.pathname.split('/').filter(Boolean)
      const isPathStyle = pathParts.length >= 2 && pathParts[0] === this.bucket
      
      if (!isPathStyle) {
        console.warn(
          `[S3 Storage] ⚠️ L'URL générée n'est pas en path-style. ` +
          `Hostname: ${urlObj.hostname}, Path: ${urlObj.pathname}. ` +
          `Vérifiez que le client S3 est correctement configuré avec forcePathStyle=true et endpoint=${this.endpoint || 'non défini'}`
        )
      } else {
        console.log(`[S3 Storage] ✅ URL générée en path-style: ${urlObj.hostname}${urlObj.pathname}`)
      }
    }
    
    return signedUrl
  }

  async getBuffer(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })
    const res: any = await this.client.send(command)
    if (res.Body?.transformToByteArray) {
      const arr = await res.Body.transformToByteArray()
      return Buffer.from(arr)
    }
    return await streamToBuffer(res.Body)
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    await this.client.send(command)
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
      await this.client.send(command)
      return true
    } catch (error: unknown) {
      // Vérifier si c'est une erreur "not found" (fichier n'existe pas)
      if (error && typeof error === 'object') {
        // Vérifier le nom de l'erreur
        if ('name' in error && (error.name === 'NotFound' || error.name === 'NoSuchKey')) {
          return false
        }
        // Vérifier le code HTTP
        if ('$metadata' in error) {
          const metadata = error.$metadata as { httpStatusCode?: number }
          if (metadata?.httpStatusCode === 404) {
            return false
          }
        }
        // Vérifier le code d'erreur S3
        if ('Code' in error) {
          const code = error.Code as string
          if (code === 'NoSuchKey' || code === 'NotFound' || code === '404') {
            return false
          }
        }
      }
      // Si c'est une autre erreur (permissions, etc.), la propager
      throw error
    }
  }
}

/**
 * Adaptateur de stockage local (pour développement)
 */
export class LocalStorageAdapter implements StorageAdapter {
  private baseDir: string

  constructor(baseDir: string = './uploads') {
    this.baseDir = path.resolve(baseDir)
  }

  async upload(buffer: Buffer, key: string, _contentType: string): Promise<string> {
    const fullPath = path.join(this.baseDir, key)
    const dir = path.dirname(fullPath)

    // Créer le répertoire s'il n'existe pas
    await fs.mkdir(dir, { recursive: true })

    // Écrire le fichier
    await fs.writeFile(fullPath, buffer)

    return key
  }

  async getUrl(key: string): Promise<string> {
    // Pour le dev local, retourner une URL relative pointant vers la route API
    return buildAbsoluteUrl(`/api/uploads/${key}`)
  }

  async getSignedUrl(key: string, _expiresIn?: number): Promise<string> {
    // Pas besoin de signed URL en local
    return this.getUrl(key)
  }

  async getBuffer(key: string): Promise<Buffer> {
    const fullPath = path.join(this.baseDir, key)
    return await fs.readFile(fullPath)
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.baseDir, key)
    await fs.unlink(fullPath).catch(() => {
      // Ignorer si le fichier n'existe pas
    })
  }

  async exists(key: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.baseDir, key)
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Adaptateur de stockage FTP
 */
export class FTPStorageAdapter implements StorageAdapter {
  private config: {
    host: string
    user: string
    password: string
    secure?: boolean
    port?: number
    basePath?: string
  }

  constructor(config: {
    host: string
    user: string
    password: string
    secure?: boolean
    port?: number
    basePath?: string
  }) {
    this.config = config
  }

  private async getClient() {
    const client = new Client()
    await client.access({
      host: this.config.host,
      user: this.config.user,
      password: this.config.password,
      secure: this.config.secure ?? false,
      port: this.config.port ?? 21,
    })
    return client
  }

  async upload(buffer: Buffer, key: string, _contentType: string): Promise<string> {
    const client = await this.getClient()

    try {
      const fullPath = this.config.basePath
        ? `${this.config.basePath}/${key}`
        : key

      // Créer les répertoires si nécessaire
      const dir = path.dirname(fullPath)
      if (dir !== '.') {
        await client.ensureDir(dir)
      }

      // Upload le fichier depuis un stream
      const { Readable } = await import('stream')
      const stream = Readable.from(buffer)
      await client.uploadFrom(stream, fullPath)

      return key
    } finally {
      client.close()
    }
  }

  async getUrl(key: string): Promise<string> {
    // Les URLs FTP dépendent de la configuration du serveur
    // Retourner une URL FTP basique
    const protocol = this.config.secure ? 'ftps' : 'ftp'
    const host = this.config.host
    const port = this.config.port && this.config.port !== 21 ? `:${this.config.port}` : ''
    const basePath = this.config.basePath ? `${this.config.basePath}/` : ''
    return `${protocol}://${host}${port}/${basePath}${key}`
  }

  async getSignedUrl(key: string, _expiresIn?: number): Promise<string> {
    // FTP ne supporte pas les signed URLs, retourner l'URL normale
    return this.getUrl(key)
  }

  async getBuffer(key: string): Promise<Buffer> {
    const client = await this.getClient()
    try {
      const tempDir = path.join(process.cwd(), '.tmp_ftp')
      await fs.mkdir(tempDir, { recursive: true })
      const tmpPath = path.join(tempDir, `${Date.now()}-${Math.random().toString(36).slice(2)}.bin`)
      const fullPath = this.config.basePath ? `${this.config.basePath}/${key}` : key
      await client.downloadTo(tmpPath, fullPath)
      const buf = await fs.readFile(tmpPath)
      await fs.unlink(tmpPath).catch(() => {})
      return buf
    } finally {
      client.close()
    }
  }

  async delete(key: string): Promise<void> {
    const client = await this.getClient()

    try {
      const fullPath = this.config.basePath
        ? `${this.config.basePath}/${key}`
        : key

      await client.remove(fullPath)
    } finally {
      client.close()
    }
  }

  async exists(key: string): Promise<boolean> {
    const client = await this.getClient()
    try {
      const fullPath = this.config.basePath
        ? `${this.config.basePath}/${key}`
        : key
      await client.size(fullPath)
      return true
    } catch {
      return false
    } finally {
      client.close()
    }
  }
}

/**
 * Factory pour créer l'adaptateur de stockage approprié selon l'environnement
 */
export function createStorageAdapter(): StorageAdapter {
  const storageType = process.env['STORAGE_TYPE'] || 'local'

  switch (storageType) {
    case 's3':
      if (!process.env['S3_BUCKET_NAME']) {
        throw new Error('S3_BUCKET_NAME is required for S3 storage')
      }
      {
        let endpoint = process.env['S3_ENDPOINT'] || process.env['MINIO_ENDPOINT']
        
        // Normaliser l'URL de l'endpoint (ajouter https:// si manquant)
        if (endpoint && !/^https?:\/\//i.test(endpoint)) {
          endpoint = `https://${endpoint}`
        }
        
        const regionMaybe = process.env['AWS_REGION'] || (endpoint ? 'us-east-1' : undefined)
        if (!regionMaybe) {
          throw new Error('AWS_REGION is required unless S3_ENDPOINT/MINIO_ENDPOINT is provided')
        }
        const region: string = regionMaybe
        
        // TOUJOURS utiliser path-style (compatible AWS S3 et MinIO)
        // Le path-style fonctionne pour AWS S3 ET MinIO, donc on l'utilise par défaut
        const options = {
          ...(endpoint ? { endpoint } : {}),
          forcePathStyle: true, // Toujours activer path-style pour compatibilité
        }

        // Utiliser S3_BUCKET_NAME en priorité, sinon AWS_S3_BUCKET
        const bucketNameEnv = process.env['S3_BUCKET_NAME'] || process.env['AWS_S3_BUCKET']
        // Nettoyer le nom du bucket (supprimer les espaces et caractères parasites comme {})
        const bucketName: string = bucketNameEnv?.trim().replace(/[{}]/g, '') || ''
        
        if (!bucketName) {
          throw new Error('S3_BUCKET_NAME or AWS_S3_BUCKET is required and cannot be empty for S3 storage')
        }

        return new S3StorageAdapter(
          bucketName,
          region,
          process.env['AWS_ACCESS_KEY_ID'],
          process.env['AWS_SECRET_ACCESS_KEY'],
          options
        )
      }

    case 'ftp':
      if (!process.env['FTP_HOST'] || !process.env['FTP_USER'] || !process.env['FTP_PASSWORD']) {
        throw new Error('FTP_HOST, FTP_USER, and FTP_PASSWORD are required for FTP storage')
      }
      return new FTPStorageAdapter({
        host: process.env['FTP_HOST'],
        user: process.env['FTP_USER'],
        password: process.env['FTP_PASSWORD'],
        secure: process.env['FTP_SECURE'] === 'true',
        ...(process.env['FTP_PORT'] && { port: parseInt(process.env['FTP_PORT'], 10) }),
        ...(process.env['FTP_BASE_PATH'] && { basePath: process.env['FTP_BASE_PATH'] }),
      })

    case 'local':
    default:
      return new LocalStorageAdapter(process.env['LOCAL_STORAGE_DIR'] || './uploads')
  }
}

export const storage = createStorageAdapter()

