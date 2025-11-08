import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { signupSchema } from '@/shared/schemas/auth'
import { Prisma } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = signupSchema.parse(body)

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Un compte avec cet email existe déjà' }, { status: 400 })
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Préparer la configuration email si fournie
    const emailConfig: {
      organizationName?: string
      appName?: string
      contactEmail?: string
    } = {}

    if (validatedData.emailConfig) {
      if (validatedData.emailConfig.organizationName?.trim()) {
        emailConfig.organizationName = validatedData.emailConfig.organizationName.trim()
      }
      if (validatedData.emailConfig.appName?.trim()) {
        emailConfig.appName = validatedData.emailConfig.appName.trim()
      }
      if (
        validatedData.emailConfig.contactEmail &&
        validatedData.emailConfig.contactEmail.trim() &&
        validatedData.emailConfig.contactEmail !== ''
      ) {
        emailConfig.contactEmail = validatedData.emailConfig.contactEmail.trim()
      }
    }

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        passwordHash: hashedPassword,
        role: 'user',
      },
    })

    // Créer un projet par défaut avec la configuration email
    const defaultProject = await prisma.project.create({
      data: {
        name: 'Mon premier projet',
        description: "Projet créé automatiquement lors de l'inscription",
        ownerId: user.id,
        ...(Object.keys(emailConfig).length > 0 && {
          emailConfig: emailConfig as Prisma.InputJsonValue,
        }),
      },
    })

    return NextResponse.json(
      {
        message: 'Compte créé avec succès',
        userId: user.id,
        projectId: defaultProject.id,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Données invalides', details: error.message },
        { status: 400 }
      )
    }

    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la création du compte' },
      { status: 500 }
    )
  }
}
