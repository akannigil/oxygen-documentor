import { prisma } from '@/lib/prisma'
import type { EmailConfig } from './config'

/**
 * Récupère la configuration email d'un projet depuis la base de données
 * @param projectId ID du projet
 * @returns Configuration email ou null si non configurée
 */
export async function getProjectEmailConfig(projectId: string): Promise<EmailConfig | null> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        emailConfig: true,
      },
    })

    if (!project) {
      return null
    }

    return (project.emailConfig as EmailConfig | null) || null
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration email:', error)
    return null
  }
}

