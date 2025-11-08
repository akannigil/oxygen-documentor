import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createStorageAdapterFromConfig } from '@/lib/storage/config'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const path = url.searchParams.get('path')
    const expiresParam = url.searchParams.get('expiresIn')
    const expiresIn = expiresParam
      ? Math.max(60, Math.min(60 * 60 * 24, parseInt(expiresParam, 10) || 0))
      : 3600

    if (!path) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
    }

    // Extraire le projectId du chemin de type "projects/{projectId}/documents/..."
    const match = /^projects\/([^/]+)\//.exec(path)
    const projectId = match?.[1]
    if (!projectId) {
      return NextResponse.json(
        { error: 'Invalid path: missing projectId (expected projects/{projectId}/...)' },
        { status: 400 }
      )
    }

    // Charger la configuration de stockage spécifique au projet
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { storageConfig: true },
    })
    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    const projectStorage = createStorageAdapterFromConfig(project.storageConfig as any)

    // Générer une URL signée à la volée (fallback vers URL normale du même adaptateur)
    let target: string
    try {
      target = await projectStorage.getSignedUrl(path, expiresIn)
    } catch {
      target = await projectStorage.getUrl(path)
    }

    return NextResponse.redirect(target, { status: 302 })
  } catch (error) {
    console.error('Redirect error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
