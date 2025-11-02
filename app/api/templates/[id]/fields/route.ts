import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateTemplateFieldsSchema } from '@/shared/schemas/template'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Valider les données
    const validatedData = updateTemplateFieldsSchema.parse(body)

    // Vérifier que le template existe et appartient à l'utilisateur
    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            ownerId: true,
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

    // Mettre à jour les champs
    const updatedTemplate = await prisma.template.update({
      where: { id },
      data: {
        fields: validatedData.fields,
      },
    })

    return NextResponse.json(updatedTemplate)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating template fields:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}

