import { ReactNode } from 'react'
import { AppBar } from './AppBar'
import { Footer } from './Footer'

interface MainLayoutProps {
  children: ReactNode
  userEmail?: string | undefined
  userName?: string | null | undefined
  breadcrumb?: React.ReactNode
}

export function MainLayout({ children, userEmail, userName, breadcrumb }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AppBar userEmail={userEmail} userName={userName} breadcrumb={breadcrumb} />
      <main className="flex-1">{children}</main>
      <Footer userEmail={userEmail} />
    </div>
  )
}

