import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'

interface RouteParams {
  params: Promise<{ path: string[] }>
}

/**
 * Route API pour servir les fichiers uploadés depuis le storage local
 * Vérifie l'authentification et les permissions avant de servir le fichier
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { path: pathArray } = await params
    const filePath = pathArray.join('/')

    // Vérifier que le chemin correspond au format attendu: projects/{projectId}/templates/...
    const pathParts = filePath.split('/')
    if (pathParts.length < 4 || pathParts[0] !== 'projects') {
      return NextResponse.json({ error: 'Chemin invalide' }, { status: 400 })
    }

    const projectId = pathParts[1]
    if (!projectId) {
      return NextResponse.json({ error: 'Chemin invalide' }, { status: 400 })
    }

    // Vérifier que le projet existe et appartient à l'utilisateur
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    if (project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Pour le storage local, récupérer le fichier depuis le système de fichiers
    const storageType = process.env['STORAGE_TYPE'] || 'local'

    if (storageType === 'local') {
      const baseDir = process.env['LOCAL_STORAGE_DIR'] || './uploads'
      const fullPath = path.resolve(baseDir, filePath)

      // Vérifier que le chemin est bien dans le dossier uploads (sécurité)
      const baseDirResolved = path.resolve(baseDir)
      if (!fullPath.startsWith(baseDirResolved)) {
        return NextResponse.json({ error: 'Chemin invalide' }, { status: 400 })
      }

      // Vérifier que le fichier existe
      if (!existsSync(fullPath)) {
        return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 })
      }

      // Lire le fichier
      const fileBuffer = await fs.readFile(fullPath)

      // Déterminer le type MIME
      const ext = path.extname(fullPath).toLowerCase()
      const mimeTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      }
      const contentType = mimeTypes[ext] || 'application/octet-stream'

      // Retourner le fichier avec les bons headers
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }

    // Pour S3 ou FTP, utiliser la méthode getSignedUrl du storage
    // et rediriger vers l'URL signée
    const signedUrl = await storage.getSignedUrl(filePath, 3600)

    return NextResponse.redirect(signedUrl)
  } catch (error) {
    console.error('Error serving upload file:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}
