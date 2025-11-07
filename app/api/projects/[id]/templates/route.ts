import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createStorageAdapterFromConfig } from '@/lib/storage/config'
import type { StorageConfig } from '@/lib/storage/config'
import { randomUUID } from 'crypto'
import { validateDOCXTemplate } from '@/lib/templates/docx-parser'
import type { TemplateType } from '@/shared/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
]

/**
 * Détermine le type de template à partir du MIME type
 */
function getTemplateType(mimeType: string): TemplateType {
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    return 'docx'
  return 'pdf' // Par défaut
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: projectId } = await params

    // Vérifier que le projet existe et appartient à l'utilisateur
    // Récupérer aussi la configuration de stockage du projet
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        ownerId: true,
        storageConfig: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    if (project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Récupérer la configuration de stockage du projet ou utiliser celle par défaut
    const projectStorageConfig = project.storageConfig as StorageConfig | null | undefined
    const projectStorage = createStorageAdapterFromConfig(projectStorageConfig)

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
        { error: 'Type de fichier non supporté. Utilisez PDF, PNG, JPG ou DOCX.' },
        { status: 400 }
      )
    }

    // Convertir le File en Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Déterminer le type de template
    const templateType = getTemplateType(file.type)

    // Pour les templates DOCX, parser les variables
    let variables: Array<{ name: string; occurrences: number; context?: string }> | undefined
    if (templateType === 'docx') {
      try {
        const validation = await validateDOCXTemplate(buffer)
        if (!validation.isValid) {
          return NextResponse.json(
            { error: validation.error || 'Erreur lors de la validation du template DOCX' },
            { status: 400 }
          )
        }
        variables = validation.variables
      } catch (error) {
        console.error('Error parsing DOCX template:', error)
        return NextResponse.json(
          {
            error:
              "Erreur lors de l'analyse du template DOCX. Assurez-vous qu'il contient des variables {{...}}",
          },
          { status: 400 }
        )
      }
    }

    // Générer une clé unique pour le stockage
    const fileExtension = file.name.split('.').pop() || 'pdf'
    const storageKey = `projects/${projectId}/templates/${randomUUID()}.${fileExtension}`

    // Upload vers le storage en utilisant la configuration du projet
    await projectStorage.upload(buffer, storageKey, file.type)

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
        templateType, // templateType existe dans le schéma Prisma mais le client généré ne le reconnaît pas encore
        width: width || null,
        height: height || null,
        fields: templateType === 'docx' ? [] : [], // Pour DOCX, on n'utilise pas fields
        variables: variables ? JSON.parse(JSON.stringify(variables)) : null, // Convertir en JSON pour Prisma
      } as any, // Cast nécessaire car templateType n'est pas reconnu par le client Prisma généré
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
    return NextResponse.json({ error: "Une erreur est survenue lors de l'upload" }, { status: 500 })
  }
}
