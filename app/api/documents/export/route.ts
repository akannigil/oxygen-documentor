import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const exportQuerySchema = z.object({
  projectId: z.string(),
  status: z.enum(['generated', 'sent', 'failed']).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    
    const queryParams = {
      projectId: searchParams.get('projectId') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      startDate: searchParams.get('startDate') ?? undefined,
      endDate: searchParams.get('endDate') ?? undefined,
    }

    const validated = exportQuerySchema.parse(queryParams)

    if (!validated.projectId) {
      return NextResponse.json({ error: 'projectId requis' }, { status: 400 })
    }

    const project = await prisma.project.findUnique({ where: { id: validated.projectId } })
    if (!project) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    if (project.ownerId !== session.user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    // Construire les filtres (même logique que l'API de liste)
    const where: any = {
      projectId: validated.projectId,
    }

    if (validated.status) {
      where.status = validated.status
    }

    if (validated.search) {
      where.OR = [
        { recipient: { contains: validated.search, mode: 'insensitive' } },
        { recipientEmail: { contains: validated.search, mode: 'insensitive' } },
        { id: { contains: validated.search, mode: 'insensitive' } },
      ]
    }

    if (validated.startDate || validated.endDate) {
      where.createdAt = {}
      if (validated.startDate) {
        where.createdAt.gte = new Date(validated.startDate)
      }
      if (validated.endDate) {
        where.createdAt.lte = new Date(validated.endDate)
      }
    }

    // Récupérer tous les documents (sans pagination pour l'export)
    const docs = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Générer le CSV
    const headers = ['ID', 'Template', 'Statut', 'Destinataire', 'Email', 'Date création', 'Date envoi', 'Message erreur']
    const rows = docs.map((doc) => [
      doc.id,
      doc.template?.name || doc.templateId,
      doc.status === 'sent' ? 'Envoyé' : doc.status === 'failed' ? 'Échoué' : 'Généré',
      doc.recipient || '',
      doc.recipientEmail || '',
      doc.createdAt.toISOString(),
      doc.emailSentAt ? doc.emailSentAt.toISOString() : '',
      doc.errorMessage || '',
    ])

    // Échapper les valeurs CSV
    const escapeCSV = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map((cell) => escapeCSV(String(cell ?? ''))).join(',')),
    ].join('\n')

    // Ajouter BOM pour Excel UTF-8
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="documents_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export CSV error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Paramètres invalides', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

