import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Client } from 'basic-ftp'

export interface StorageAdapter {
  upload(buffer: Buffer, key: string, contentType: string): Promise<string>
  getUrl(key: string): Promise<string>
  getSignedUrl(key: string, expiresIn?: number): Promise<string>
  delete(key: string): Promise<void>
}

/**
 * Adaptateur de stockage utilisant AWS S3
 */
export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client
  private bucket: string
  private region: string

  constructor(bucket: string, region: string, accessKeyId?: string, secretAccessKey?: string) {
    this.bucket = bucket
    this.region = region

    this.client = new S3Client({
      region: this.region,
      ...(accessKeyId && secretAccessKey && {
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      }),
    })
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
    // URL publique si le bucket est public, sinon utiliser signed URL
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    return await getSignedUrl(this.client, command, { expiresIn })
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    await this.client.send(command)
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
    return `/api/uploads/${key}`
  }

  async getSignedUrl(key: string, _expiresIn?: number): Promise<string> {
    // Pas besoin de signed URL en local
    return this.getUrl(key)
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.baseDir, key)
    await fs.unlink(fullPath).catch(() => {
      // Ignorer si le fichier n'existe pas
    })
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
}

/**
 * Factory pour créer l'adaptateur de stockage approprié selon l'environnement
 */
export function createStorageAdapter(): StorageAdapter {
  const storageType = process.env['STORAGE_TYPE'] || 'local'

  switch (storageType) {
    case 's3':
      if (!process.env['AWS_REGION'] || !process.env['S3_BUCKET_NAME']) {
        throw new Error('AWS_REGION and S3_BUCKET_NAME are required for S3 storage')
      }
      return new S3StorageAdapter(
        process.env['S3_BUCKET_NAME'],
        process.env['AWS_REGION'],
        process.env['AWS_ACCESS_KEY_ID'],
        process.env['AWS_SECRET_ACCESS_KEY']
      )

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

