import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createStorageAdapterFromConfig } from '@/lib/storage/config'
import type { StorageConfig } from '@/lib/storage/config'
import { getAdapter, type GenerationContext } from '@/lib/generation/adapters'
import type { CertificateAuthConfig } from '@/lib/qrcode/certificate-auth'
import type { TemplateType, OutputFormat } from '@/shared/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/templates/[id]/preview
 * Génère une prévisualisation d'un document unique avec des données de test
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: templateId } = await params
    const body = await request.json()
    const { data, outputFormat, pdfOptions, styleOptions } = body

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Données de prévisualisation requises' }, { status: 400 })
    }

    // Récupérer le template
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: {
        project: {
          select: {
            id: true,
            ownerId: true,
            storageConfig: true,
          },
        },
      },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
    }

    if (template.project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Récupérer le buffer du template
    const projectStorageConfig = template.project.storageConfig as StorageConfig | null | undefined
    const projectStorage = createStorageAdapterFromConfig(projectStorageConfig)
    const templateBuffer = await projectStorage.getBuffer(template.filePath)

    // Déterminer le type de template
    const getTemplateType = (mimeType: string): TemplateType => {
      if (mimeType === 'application/pdf') return 'pdf'
      if (mimeType.startsWith('image/')) return 'image'
      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        return 'docx'
      return 'pdf'
    }

    const templateType = getTemplateType(template.mimeType)
    // Pour la prévisualisation, toujours utiliser PDF car c'est le seul format affichable dans un iframe
    // Même si l'utilisateur a choisi DOCX comme format de sortie, on convertit en PDF pour l'aperçu
    const desiredFormat: OutputFormat = 'pdf'

    // Préparer le contexte de génération
    const authConfig: CertificateAuthConfig | undefined = process.env['CERTIFICATE_SECRET_KEY']
      ? {
          secretKey: process.env['CERTIFICATE_SECRET_KEY'],
          verificationBaseUrl: process.env['CERTIFICATE_VERIFICATION_BASE_URL']!,
          algorithm: 'sha256',
        }
      : undefined

    // Pour la prévisualisation, utiliser un chemin fictif pour les QR codes avec stockage
    // Ce chemin sera utilisé pour générer des URLs de placeholder
    const previewDocumentFilePath = `preview/${templateId}/preview.${desiredFormat}`

    // Pour la prévisualisation, ne pas générer de vraies URLs de stockage
    // Utiliser des URLs de placeholder à la place
    const getStorageUrl = async (filePath: string, signed = false, expiresIn = 3600) => {
      return `https://example.com/preview/${filePath}?signed=${signed}&expires=${expiresIn}`
    }

    // Pour les templates DOCX, toujours fournir des options PDF pour la conversion
    // Utiliser les options fournies ou des valeurs par défaut
    const finalPdfOptions =
      templateType === 'docx'
        ? pdfOptions || {
            format: 'A4',
            orientation: 'portrait',
            method: 'libreoffice',
          }
        : pdfOptions

    const context: GenerationContext = {
      templateBuffer,
      templateMimeType: template.mimeType,
      data,
      fields: template.fields as any,
      qrcodeConfigs: template.qrcodeConfigs as any,
      ...(authConfig ? { authConfig } : {}),
      documentFilePath: previewDocumentFilePath,
      getStorageUrl,
      ...(finalPdfOptions ? { pdfOptions: finalPdfOptions } : {}),
      ...(styleOptions ? { styleOptions } : {}),
    }

    // Générer le document
    const adapter = getAdapter(templateType)
    const result = await adapter.generate(desiredFormat as any, context)

    // Retourner le document en tant que réponse
    // Convertir le Buffer Node.js en Uint8Array pour NextResponse
    const uint8Array = new Uint8Array(result.buffer)
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `inline; filename="preview.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Preview generation error:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la génération de la prévisualisation',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    )
  }
}

