import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { storage } from '@/lib/storage/adapters'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const path = url.searchParams.get('path')
    const expiresParam = url.searchParams.get('expiresIn')
    const expiresIn = expiresParam ? Math.max(60, Math.min(60 * 60 * 24, parseInt(expiresParam, 10) || 0)) : 3600

    if (!path) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
    }

    // Générer une URL signée à la volée (fallback vers URL normale)
    let target: string
    try {
      target = await storage.getSignedUrl(path, expiresIn)
    } catch {
      target = await storage.getUrl(path)
    }

    return NextResponse.redirect(target, { status: 302 })
  } catch (error) {
    console.error('Redirect error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}


