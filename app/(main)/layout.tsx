import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { MainLayout } from '@/components/layout/MainLayout'

interface MainGroupLayoutProps {
  children: ReactNode
}

export default async function MainGroupLayout({ children }: MainGroupLayoutProps) {
  const session = await auth()

  // Si l'utilisateur n'est pas connecté, le rediriger vers la page de connexion
  // Sauf pour les pages publiques (login, signup)
  if (!session) {
    redirect('/login')
  }

  return (
    <MainLayout userEmail={session.user.email} userName={session.user.name}>
      {children}
    </MainLayout>
  )
}

