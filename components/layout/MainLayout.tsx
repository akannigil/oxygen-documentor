import { ReactNode } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { ContextualNav } from './ContextualNav'

interface MainLayoutProps {
  children: ReactNode
  userEmail?: string | undefined
  userName?: string | null | undefined
}

export function MainLayout({ children, userEmail, userName }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header userEmail={userEmail} userName={userName} />
      <ContextualNav />
      <main className="flex-1 bg-gradient-to-br from-gray-50 via-white to-gray-50">
        {children}
      </main>
      <Footer userEmail={userEmail} />
    </div>
  )
}

