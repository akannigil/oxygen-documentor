import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createProjectSchema } from '@/shared/schemas/project'
import { z } from 'zod'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: {
        ownerId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            templates: true,
            documents: true,
          },
        },
      },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    if (!session.user.id) {
      console.error('Session user ID is missing:', session.user)
      return NextResponse.json(
        { error: 'ID utilisateur manquant dans la session' },
        { status: 500 }
      )
    }

    // Vérifier que l'utilisateur existe dans la base de données
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    })

    if (!userExists) {
      console.error('User does not exist in database:', session.user.id)
      return NextResponse.json(
        { error: 'Utilisateur non trouvé. Veuillez vous reconnecter.' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = createProjectSchema.parse(body)

    const project = await prisma.project.create({
      data: {
        name: validatedData.name,
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ownerId: session.user.id,
      },
      include: {
        _count: {
          select: {
            templates: true,
            documents: true,
          },
        },
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
