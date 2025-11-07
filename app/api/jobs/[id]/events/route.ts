import { NextResponse } from 'next/server'
import { QueueEvents } from 'bullmq'
import { createRedisConnection } from '@/lib/queue/queues'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id: jobId } = await params

  const connection = createRedisConnection()
  if (!connection) {
    return NextResponse.json({ error: 'SSE indisponible: Redis non configuré' }, { status: 503 })
  }

  const queueEvents = new QueueEvents('document-generation', { connection })

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()
      let isClosed = false

      const send = (data: unknown) => {
        if (isClosed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch (error) {
          // Controller might be closed, ignore the error
          isClosed = true
        }
      }

      // Envoi initial
      send({ state: 'subscribed', jobId })

      // Déclarer ping avant les handlers pour éviter les erreurs de référence
      let ping: NodeJS.Timeout | null = null

      const onProgress = ({ jobId: eid, data }: { jobId: string; data: unknown }) => {
        if (eid !== jobId || isClosed) return
        if (typeof data === 'number') {
          send({ state: 'active', progress: data })
        } else if (data && typeof data === 'object') {
          const d = data as { percent?: number; current?: number; total?: number }
          send({ state: 'active', progress: d.percent ?? 0, current: d.current, total: d.total })
        } else {
          send({ state: 'active' })
        }
      }
      const onCompleted = ({
        jobId: eid,
        returnvalue,
      }: {
        jobId: string
        returnvalue: unknown
      }) => {
        if (eid === jobId && !isClosed) {
          send({ state: 'completed', progress: 100, returnValue: returnvalue })
          isClosed = true
          if (ping) clearInterval(ping)
          removeListeners()
          controller.close()
        }
      }
      const onFailed = ({ jobId: eid, failedReason }: { jobId: string; failedReason: string }) => {
        if (eid === jobId && !isClosed) {
          send({ state: 'failed', failedReason })
          isClosed = true
          if (ping) clearInterval(ping)
          removeListeners()
          controller.close()
        }
      }
      const onActive = ({ jobId: eid }: { jobId: string }) => {
        if (eid === jobId && !isClosed) send({ state: 'active' })
      }
      const onWaiting = ({ jobId: eid }: { jobId: string }) => {
        if (eid === jobId && !isClosed) send({ state: 'queued' })
      }

      // Fonction helper pour nettoyer les listeners
      const removeListeners = () => {
        queueEvents.off('progress', onProgress as any)
        queueEvents.off('completed', onCompleted as any)
        queueEvents.off('failed', onFailed as any)
        queueEvents.off('active', onActive as any)
        queueEvents.off('waiting', onWaiting as any)
      }

      queueEvents.on('progress', onProgress as any)
      queueEvents.on('completed', onCompleted as any)
      queueEvents.on('failed', onFailed as any)
      queueEvents.on('active', onActive as any)
      queueEvents.on('waiting', onWaiting as any)

      // Keep-alive ping
      ping = setInterval(() => {
        if (isClosed) {
          if (ping) clearInterval(ping)
          return
        }
        try {
          controller.enqueue(encoder.encode(`:\n\n`))
        } catch (error) {
          // Controller is closed, stop pinging
          isClosed = true
          if (ping) clearInterval(ping)
        }
      }, 15000)

      // Cleanup
      const cleanup = async () => {
        isClosed = true
        if (ping) clearInterval(ping)
        removeListeners()
        try {
          await queueEvents.close()
        } catch {}
        try {
          await connection.quit()
        } catch {}
      }

      // In case of client disconnect, the controller will error/close automatically

      // Return a cancel method
      // @ts-expect-error: cancel is non-standard, but used internally for cleanup on disconnect
      controller.cancel = cleanup
    },
    cancel() {
      // Cleanup handled in start via controller.cancel
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
