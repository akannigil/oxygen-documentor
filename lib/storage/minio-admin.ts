/**
 * Service pour gérer les access keys MinIO via l'API Admin
 * 
 * Ce service permet de créer des utilisateurs et access keys spécifiques
 * pour un bucket via l'API Admin HTTP de MinIO.
 */

import crypto from 'crypto'
import { createHash, createHmac } from 'crypto'

export interface MinIOAdminConfig {
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  region?: string
}

export interface MinIOAccessKey {
  accessKeyId: string
  secretAccessKey: string
  userName: string
}

export interface CreateAccessKeyOptions {
  userName: string
  bucketName: string
  permissions?: ('read' | 'write' | 'delete')[]
}

/**
 * Génère une signature AWS4 pour les requêtes HTTP vers l'API Admin de MinIO
 */
function generateAWS4Signature(
  method: string,
  url: string,
  headers: Record<string, string>,
  payload: string,
  accessKey: string,
  secretKey: string,
  region: string = 'us-east-1'
): string {
  const urlObj = new URL(url)

  // Date et timestamp
  const now = new Date()
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
  const amzDate = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'

  // Headers canoniques
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((key) => `${key.toLowerCase()}:${headers[key]?.trim()}`)
    .join('\n')
  const signedHeaders = Object.keys(headers)
    .sort()
    .map((key) => key.toLowerCase())
    .join(';')

  // Payload hash
  const payloadHash = createHash('sha256').update(payload).digest('hex')

  // Canonical request
  // Pour l'API Admin, on utilise le path complet avec query string
  const canonicalQueryString = urlObj.search ? urlObj.search.substring(1) : ''
  const canonicalRequest = [
    method,
    urlObj.pathname,
    canonicalQueryString,
    canonicalHeaders + '\n',
    signedHeaders,
    payloadHash,
  ].join('\n')

  // String to sign
  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n')

  // Calcul de la signature
  const kDate = createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest()
  const kRegion = createHmac('sha256', kDate).update(region).digest()
  const kService = createHmac('sha256', kRegion).update('s3').digest()
  const kSigning = createHmac('sha256', kService).update('aws4_request').digest()
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex')

  return signature
}

/**
 * Génère une politique IAM pour un bucket spécifique
 */
function generateBucketPolicy(
  bucketName: string,
  permissions: ('read' | 'write' | 'delete')[]
): string {
  const actions: string[] = []
  
  if (permissions.includes('read')) {
    actions.push('s3:GetObject', 's3:ListBucket')
  }
  if (permissions.includes('write')) {
    actions.push('s3:PutObject', 's3:PutObjectAcl')
  }
  if (permissions.includes('delete')) {
    actions.push('s3:DeleteObject')
  }

  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: actions,
        Resource: [
          `arn:aws:s3:::${bucketName}/*`,
          `arn:aws:s3:::${bucketName}`,
        ],
      },
    ],
  }

  return JSON.stringify(policy)
}

/**
 * Fait une requête HTTP signée vers l'API Admin de MinIO
 */
async function makeMinIOAdminRequest(
  config: MinIOAdminConfig,
  method: string,
  path: string,
  body?: any
): Promise<any> {
  const endpoint = config.endpoint.replace(/\/$/, '')
  const url = `${endpoint}${path}`
  const region = config.region || 'us-east-1'

  const now = new Date()
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
  const amzDate = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'

  const payload = body ? JSON.stringify(body) : ''

  const urlObj = new URL(url)

  const headers: Record<string, string> = {
    'Host': urlObj.hostname + (urlObj.port ? `:${urlObj.port}` : ''),
    'X-Amz-Date': amzDate,
    'Content-Type': 'application/json',
    'Content-Length': String(payload.length),
  }

  // Générer la signature
  const signature = generateAWS4Signature(
    method,
    url,
    headers,
    payload,
    config.accessKeyId,
    config.secretAccessKey,
    region
  )

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${Object.keys(headers).sort().map(k => k.toLowerCase()).join(';')}, Signature=${signature}`

  headers['Authorization'] = authorization

  const fetchOptions: RequestInit = {
    method,
    headers,
  }

  if (payload) {
    fetchOptions.body = payload
  }

  const response = await fetch(url, fetchOptions)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`MinIO Admin API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  if (response.headers.get('content-type')?.includes('application/json')) {
    return await response.json()
  }

  return await response.text()
}

/**
 * Crée un utilisateur MinIO avec des access keys spécifiques pour un bucket
 * 
 * Cette fonction utilise l'API Admin HTTP de MinIO pour :
 * 1. Créer une policy pour le bucket
 * 2. Créer un utilisateur
 * 3. Assigner la policy à l'utilisateur
 * 4. Générer les access keys
 */
export async function createMinIOAccessKey(
  adminConfig: MinIOAdminConfig,
  options: CreateAccessKeyOptions
): Promise<MinIOAccessKey> {
  const { userName, bucketName, permissions = ['read', 'write'] } = options

  try {
    // Étape 1: Créer la policy pour le bucket
    const policy = generateBucketPolicy(bucketName, permissions)
    const policyName = `${userName}-${bucketName}-policy`.toLowerCase()

    try {
      await makeMinIOAdminRequest(adminConfig, 'PUT', `/minio/admin/v3/add-canned-policy`, {
        name: policyName,
        policy: policy,
      })
    } catch (error: any) {
      // Si la policy existe déjà, on continue
      if (!error.message?.includes('409') && !error.message?.includes('already exists')) {
        console.warn(`[MinIO Admin] Erreur lors de la création de la policy: ${error.message}`)
        // On continue quand même, la policy pourrait déjà exister
      }
    }

    // Étape 2: Générer des credentials aléatoires
    const accessKeyId = `AKIA${crypto.randomBytes(16).toString('hex').toUpperCase()}`
    const secretAccessKey = crypto.randomBytes(32).toString('base64')

    // Étape 3: Créer l'utilisateur avec les credentials
    try {
      await makeMinIOAdminRequest(adminConfig, 'PUT', `/minio/admin/v3/add-user`, {
        accessKey: accessKeyId,
        secretKey: secretAccessKey,
        userStatus: 'enabled',
      })
    } catch (error: any) {
      // Si l'utilisateur existe déjà, on continue
      if (!error.message?.includes('409') && !error.message?.includes('already exists')) {
        throw new Error(`Erreur lors de la création de l'utilisateur: ${error.message}`)
      }
    }

    // Étape 4: Assigner la policy à l'utilisateur
    try {
      await makeMinIOAdminRequest(adminConfig, 'PUT', `/minio/admin/v3/set-user-policy`, {
        accessKey: accessKeyId,
        policyName: policyName,
      })
    } catch (error: any) {
      console.warn(`[MinIO Admin] Erreur lors de l'assignation de la policy: ${error.message}`)
      // On continue quand même, l'utilisateur a été créé
    }

    return {
      accessKeyId,
      secretAccessKey,
      userName,
    }
  } catch (error) {
    throw new Error(
      `Erreur lors de la création de l'access key MinIO: ${
        error instanceof Error ? error.message : 'Erreur inconnue'
      }`
    )
  }
}

/**
 * Alternative: Utiliser mc (MinIO Client) via commande système
 * 
 * Cette fonction nécessite que mc soit installé et configuré sur le serveur.
 */
export async function createMinIOAccessKeyViaMC(
  adminConfig: MinIOAdminConfig,
  options: CreateAccessKeyOptions
): Promise<MinIOAccessKey> {
  // Générer des credentials
  const accessKeyId = `AKIA${crypto.randomBytes(16).toString('hex').toUpperCase()}`
  const secretAccessKey = crypto.randomBytes(32).toString('base64')

  // Note: Cette implémentation nécessiterait d'exécuter mc en tant que processus
  // et de parser la sortie. Pour l'instant, on retourne les credentials générés.
  
  return {
    accessKeyId,
    secretAccessKey,
    userName: options.userName,
  }
}

/**
 * Vérifie si les credentials admin sont valides
 */
export async function validateMinIOAdminCredentials(
  config: MinIOAdminConfig
): Promise<boolean> {
  try {
    // Tenter de lister les utilisateurs pour vérifier les credentials admin
    await makeMinIOAdminRequest(config, 'GET', '/minio/admin/v3/list-users')
    return true
  } catch (error) {
    console.error('[MinIO Admin] Erreur de validation des credentials:', error)
    return false
  }
}

