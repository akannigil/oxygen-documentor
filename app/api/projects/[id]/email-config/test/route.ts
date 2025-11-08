import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createEmailAdapterFromConfig } from '@/lib/email/config'
import type { EmailConfig } from '@/lib/email/config'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/projects/[id]/email-config/test
 * Teste la configuration email
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const body = (await request.json()) as { config: EmailConfig }

    if (!body.config || typeof body.config !== 'object') {
      return NextResponse.json({ error: 'Configuration invalide' }, { status: 400 })
    }

    // Vérifier que le projet existe et appartient à l'utilisateur
    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    if (project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Créer l'adaptateur email
    const adapter = createEmailAdapterFromConfig(body.config)

    if (!adapter) {
      return NextResponse.json({
        success: false,
        message: 'Impossible de créer l\'adaptateur email avec la configuration fournie',
      })
    }

    // Tester l'envoi d'un email de test
    const testEmail = session.user.email || 'test@example.com'
    
    // Déterminer l'adresse from selon le provider
    let fromAddress: string | undefined
    if (body.config.provider === 'resend') {
      fromAddress = body.config.from
    } else if (body.config.provider === 'smtp') {
      fromAddress = body.config.from || body.config.user
    }
    
    const result = await adapter.send({
      to: testEmail,
      subject: 'Test de configuration email - Oxygen Document',
      html: '<p>Ceci est un email de test pour vérifier votre configuration email.</p>',
      text: 'Ceci est un email de test pour vérifier votre configuration email.',
      ...(fromAddress ? { from: fromAddress } : {}),
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Email de test envoyé avec succès à ${testEmail}`,
      })
    } else {
      return NextResponse.json({
        success: false,
        message: result.error || 'Erreur lors de l\'envoi de l\'email de test',
      })
    }
  } catch (error) {
    console.error('Erreur lors du test de la configuration email:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Une erreur est survenue',
    })
  }
}

