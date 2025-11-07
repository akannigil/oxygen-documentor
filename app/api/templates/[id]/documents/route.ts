import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: templateId } = await params

    // Vérifier que l'utilisateur a accès au template via le projet
    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
        project: {
          ownerId: session.user.id,
        },
      },
      select: { id: true },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template non trouvé ou accès non autorisé' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status') as 'generated' | 'sent' | 'failed' | null
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = { templateId }
    if (status) where.status = status
    if (search) {
      where.OR = [
        { recipient: { contains: search, mode: 'insensitive' } },
        { recipientEmail: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) (where.createdAt as any).gte = new Date(startDate)
      if (endDate) (where.createdAt as any).lte = new Date(endDate)
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        recipient: true,
        recipientEmail: true,
        createdAt: true,
        updatedAt: true,
        emailSentAt: true,
        errorMessage: true,
      },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error)
    return NextResponse.json({ error: 'Une erreur interne est survenue' }, { status: 500 })
  }
}
