import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const documentsQuerySchema = z.object({
  projectId: z.string(),
  status: z.enum(['generated', 'sent', 'failed']).optional(),
  templateId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
})

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(request.url)

    // Valider les paramètres de requête
    const queryParams = {
      projectId: searchParams.get('projectId') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      templateId: searchParams.get('templateId') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      startDate: searchParams.get('startDate') ?? undefined,
      endDate: searchParams.get('endDate') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    }

    const validated = documentsQuerySchema.parse(queryParams)

    if (!validated.projectId) {
      return NextResponse.json({ error: 'projectId requis' }, { status: 400 })
    }

    const project = await prisma.project.findUnique({ where: { id: validated.projectId } })
    if (!project) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    if (project.ownerId !== session.user.id)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    // Construire les filtres Prisma
    const where: any = {
      projectId: validated.projectId,
    }

    if (validated.status) {
      where.status = validated.status
    }

    if (validated.templateId) {
      where.templateId = validated.templateId
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

    // Pagination
    const page = validated.page ?? 1
    const limit = Math.min(validated.limit ?? 20, 100) // Max 100 par page
    const skip = (page - 1) * limit

    // Compter le total pour la pagination
    const total = await prisma.document.count({ where })

    // Récupérer les documents
    const docs = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      documents: docs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('List documents error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Paramètres invalides', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
