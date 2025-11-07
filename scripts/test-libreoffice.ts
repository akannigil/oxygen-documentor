/**
 * Script de test pour LibreOffice
 * Vérifie que LibreOffice est installé et fonctionnel
 *
 * Usage: tsx scripts/test-libreoffice.ts
 */

import { checkLibreOfficeAvailable } from '../lib/libreoffice'

async function main(): Promise<void> {
  console.log('🔍 Vérification de LibreOffice...\n')

  const isAvailable = await checkLibreOfficeAvailable()

  if (isAvailable) {
    console.log('\n✅ LibreOffice est installé et fonctionnel!')
    console.log('\n📝 Fonctionnalités disponibles:')
    console.log('   • Conversion DOCX → PDF')
    console.log('   • Conversion PPTX → PDF')
    console.log('   • Conversion XLSX → PDF')
    console.log('   • Conversion ODT → PDF')
    console.log("   • Et bien d'autres formats...")
    console.log('\n💡 Utilisez lib/libreoffice.ts pour convertir vos documents')
    process.exit(0)
  } else {
    console.error("\n❌ LibreOffice n'est pas disponible!")
    console.error('\n📦 Installation requise:')
    console.error('   Alpine Linux: apk add libreoffice openjdk11-jre')
    console.error('   Ubuntu/Debian: apt-get install libreoffice')
    console.error('   macOS: brew install libreoffice')
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  console.error('❌ Erreur:', error)
  process.exit(1)
})
