import { useState, useEffect, useCallback, useRef } from 'react'
import FileUploader from './FileUploader'
import ActivityLog from './ActivityLog'
import { getUploadsStatus, getGenerationLogs, type UploadsStatusResponse, type GenerationLogEntry, type IngestState } from '../api/client'

function IngestBanner({ ingest }: { ingest: IngestState }) {
  if (ingest.status === 'idle') return null

  const configs = {
    running: { bg: 'bg-indigo-50 border-indigo-200 text-indigo-800', icon: '⏳', text: 'Re-indexing your files into the vector store…' },
    done: { bg: 'bg-green-50 border-green-200 text-green-800', icon: '✅', text: `Index updated — ${ingest.docCount} chunks from: ${ingest.sources.join(', ')}` },
    error: { bg: 'bg-red-50 border-red-200 text-red-800', icon: '❌', text: `Indexing failed: ${ingest.error ?? 'unknown error'}` },
  } as const

  const cfg = configs[ingest.status as keyof typeof configs]
  if (!cfg) return null

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-2 ${cfg.bg}`}>
      <span className="mt-0.5">{cfg.icon}</span>
      <span>{cfg.text}</span>
    </div>
  )
}

export default function ProfileManager() {
  const [statusData, setStatusData] = useState<UploadsStatusResponse>({ files: {}, ingest: { status: 'idle', lastRun: null, docCount: 0, sources: [], error: null } })
  const [logs, setLogs] = useState<GenerationLogEntry[]>([])
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshStatus = useCallback(async () => {
    try {
      const data = await getUploadsStatus()
      setStatusData(data)
      return data.ingest.status
    } catch {
      return 'idle'
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  const refreshLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const data = await getGenerationLogs(50)
      setLogs(data)
    } catch {
      // silently ignore
    } finally {
      setLoadingLogs(false)
    }
  }, [])

  // Poll every 2 s while ingest is running, stop once it settles
  const startPolling = useCallback(() => {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      const status = await refreshStatus()
      if (status !== 'running') {
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
      }
    }, 2000)
  }, [refreshStatus])

  useEffect(() => {
    void refreshStatus()
    void refreshLogs()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [refreshStatus, refreshLogs])

  const onUploadComplete = useCallback(() => {
    void refreshStatus().then((status) => {
      if (status === 'running') startPolling()
    })
  }, [refreshStatus, startPolling])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* ── File uploads ────────────────────────────────────────────────── */}
      {loadingStatus ? (
        <div className="flex items-center gap-2 text-slate-400 py-4">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading file status…
        </div>
      ) : (
        <FileUploader uploadStatus={statusData.files} onUploadComplete={onUploadComplete} />
      )}

      {/* ── Ingest status banner ─────────────────────────────────────────── */}
      <IngestBanner ingest={statusData.ingest} />

      {/* ── Activity log ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Generation History</h2>
          <button
            onClick={() => void refreshLogs()}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
        <ActivityLog logs={logs} loading={loadingLogs} />
      </div>
    </div>
  )
}

