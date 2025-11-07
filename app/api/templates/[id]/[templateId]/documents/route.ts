import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: { templateId: string }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { templateId } = params

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

    const documents = await prisma.document.findMany({
      where: {
        templateId: templateId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        status: true,
        recipient: true,
        recipientEmail: true,
        createdAt: true,
        updatedAt: true,
        errorMessage: true,
      },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error)
    return NextResponse.json({ error: 'Une erreur interne est survenue' }, { status: 500 })
  }
}
