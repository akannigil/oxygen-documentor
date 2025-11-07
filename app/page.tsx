export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="mb-4 text-4xl font-bold">Oxygen Document</h1>
        <p className="mb-8 text-xl">Application de gestion et génération d&apos;attestations</p>
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
