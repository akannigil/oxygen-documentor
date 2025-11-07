import { signOut } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST() {
  await signOut()
  return NextResponse.json({ message: 'Déconnexion réussie' })
}
