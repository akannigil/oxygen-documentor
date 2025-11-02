export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">Oxygen Document</h1>
        <p className="text-xl mb-8">Application de gestion et génération d&apos;attestations</p>
        <div className="space-y-2">
          <p>✅ Structure du projet initialisée</p>
          <p>✅ Prisma configuré avec PostgreSQL</p>
          <p>✅ Adaptateurs de stockage configurés (S3, Local, FTP)</p>
          <p>⏳ Configuration en cours...</p>
        </div>
      </div>
    </main>
  )
}

