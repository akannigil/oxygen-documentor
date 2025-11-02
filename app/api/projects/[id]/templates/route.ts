import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage'
import { randomUUID } from 'crypto'

interface RouteParams {
  params: Promise<{ id: string }>
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
]

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: projectId } = await params

    // Vérifier que le projet existe et appartient à l'utilisateur
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    if (project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Parser le FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const name = formData.get('name') as string | null
    const description = (formData.get('description') as string | null) || undefined

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })
    }

    // Vérifier la taille du fichier
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Le fichier est trop volumineux (max 10MB)' },
        { status: 400 }
      )
    }

    // Vérifier le type MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non supporté. Utilisez PDF, PNG ou JPG.' },
        { status: 400 }
      )
    }

    // Convertir le File en Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Générer une clé unique pour le stockage
    const fileExtension = file.name.split('.').pop() || 'pdf'
    const storageKey = `projects/${projectId}/templates/${randomUUID()}.${fileExtension}`

    // Upload vers le storage
    await storage.upload(buffer, storageKey, file.type)

    // Extraire les métadonnées (dimensions pour images)
    let width: number | undefined
    let height: number | undefined

    if (file.type.startsWith('image/')) {
      // Pour les images, on pourrait utiliser sharp ou canvas pour extraire les dimensions
      // Pour l'instant, on laisse undefined
      // TODO: Implémenter l'extraction des dimensions avec sharp ou canvas
    }

    // Créer le template en DB
    const template = await prisma.template.create({
      data: {
        projectId,
        name,
        description: description || null,
        filePath: storageKey,
        mimeType: file.type,
        width: width || null,
        height: height || null,
        fields: [],
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error uploading template:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de l\'upload' },
      { status: 500 }
    )
  }
}

