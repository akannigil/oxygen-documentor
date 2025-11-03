import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { auth } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ path: string[] }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { path } = await params
    const filePath = path.join('/')
    
    // Sécurité: vérifier que le chemin ne contient pas de traversée de répertoire
    if (filePath.includes('..') || filePath.includes('~')) {
      return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 })
    }

    const uploadsDir = process.env['LOCAL_STORAGE_DIR'] || './uploads'
    const fullPath = join(process.cwd(), uploadsDir, filePath)

    try {
      const fileBuffer = await readFile(fullPath)
      
      // Déterminer le type MIME basé sur l'extension
      const ext = filePath.split('.').pop()?.toLowerCase()
      let contentType = 'application/octet-stream'
      
      switch (ext) {
        case 'pdf':
          contentType = 'application/pdf'
          break
        case 'png':
          contentType = 'image/png'
          break
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg'
          break
        case 'gif':
          contentType = 'image/gif'
          break
        case 'webp':
          contentType = 'image/webp'
          break
      }

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      })
    } catch (fileError) {
      console.error('File not found:', fullPath, fileError)
      return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 })
    }
  } catch (error) {
    console.error('Upload route error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}