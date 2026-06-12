import { useState, useEffect, useRef } from 'react'
import { type GenerationLogEntry, type GenerationLogDetail, getLogDetail, compileResumePdf } from '../api/client'

const TYPE_META: Record<string, { label: string; color: string; icon: string; ext: string }> = {
  resume: { label: 'Resume', color: 'indigo', icon: '📝', ext: 'tex' },
  cover_letter: { label: 'Cover Letter', color: 'violet', icon: '✉️', ext: 'md' },
  star_answers: { label: 'STAR Answers', color: 'amber', icon: '⭐', ext: 'md' },
}

const COLOR_MAP: Record<string, string> = {
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  violet: 'bg-violet-50 border-violet-200 text-violet-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  slate: 'bg-slate-50 border-slate-200 text-slate-700',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

function truncate(str: string | null, max = 120): string {
  if (!str) return '—'
  return str.length > max ? str.slice(0, max) + '…' : str
}

function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface DetailModalProps {
  entry: GenerationLogEntry
  onClose: () => void
}

function DetailModal({ entry, onClose }: DetailModalProps) {
  const meta = TYPE_META[entry.type] ?? { label: entry.type, color: 'slate', icon: '📌', ext: 'txt' }
  const isResume = entry.type === 'resume'

  const [detail, setDetail] = useState<GenerationLogDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Resume PDF state
  const [viewMode, setViewMode] = useState<'pdf' | 'latex'>('pdf')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isCompiling, setIsCompiling] = useState(false)
  const [compileError, setCompileError] = useState('')
  const pdfUrlRef = useRef<string | null>(null)

  // Revoke blob URL on unmount to free memory
  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current)
    }
  }, [])

  useEffect(() => {
    getLogDetail(entry.id)
      .then(async (d) => {
        setDetail(d)
        setLoading(false)
        if (isResume && d.output_text) {
          setIsCompiling(true)
          try {
            const url = await compileResumePdf(d.output_text)
            pdfUrlRef.current = url
            setPdfUrl(url)
          } catch (e: unknown) {
            setCompileError(e instanceof Error ? e.message : 'Failed to compile PDF')
            setViewMode('latex')
          } finally {
            setIsCompiling(false)
          }
        }
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load details')
        setLoading(false)
      })
  }, [entry.id, isResume])

  const handleCopy = async () => {
    if (!detail?.output_text) return
    try {
      await navigator.clipboard.writeText(detail.output_text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = detail.output_text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!detail?.output_text) return
    const filename = `${entry.type}_${entry.id}.${meta.ext}`
    downloadText(detail.output_text, filename)
  }

  const handleDownloadPdf = () => {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = `resume_${entry.id}.pdf`
    a.click()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${COLOR_MAP[meta.color]}`}>
              <span>{meta.icon}</span>
              {meta.label}
            </span>
            <span className="text-xs text-slate-400">{formatDate(entry.generated_at)}</span>

            {/* PDF / LaTeX view toggle — only for resumes */}
            {isResume && !loading && detail?.output_text && (
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => setViewMode('pdf')}
                  className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                    viewMode === 'pdf'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  PDF Preview
                </button>
                <button
                  onClick={() => setViewMode('latex')}
                  className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                    viewMode === 'latex'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  LaTeX
                </button>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Meta section */}
        <div className="px-6 py-3 border-b border-slate-100 space-y-1 shrink-0 bg-slate-50">
          {entry.job_description && (
            <p className="text-xs text-slate-600">
              <span className="font-medium text-slate-500">Job Description: </span>
              {truncate(entry.job_description, 300)}
            </p>
          )}
          {entry.questions && entry.questions.length > 0 && (
            <p className="text-xs text-slate-600">
              <span className="font-medium text-slate-500">Questions: </span>
              {entry.questions.join(' · ')}
            </p>
          )}
          {entry.preferences && (
            <p className="text-xs text-slate-600">
              <span className="font-medium text-slate-500">Preferences: </span>
              {truncate(entry.preferences, 200)}
            </p>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto px-6 py-4 min-h-0">
          {loading && (
            <div className="flex items-center gap-2 text-slate-400 justify-center py-8">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading…
            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {!loading && !error && detail && (
            <>
              {/* Resume: PDF view */}
              {isResume && viewMode === 'pdf' && (
                isCompiling ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                    <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <p className="text-sm">Compiling PDF…</p>
                  </div>
                ) : compileError ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    Could not compile PDF: {compileError}. Showing LaTeX source instead.
                  </div>
                ) : pdfUrl ? (
                  <iframe
                    src={pdfUrl}
                    title="Resume PDF preview"
                    className="w-full h-[56rem] border border-slate-200 rounded-lg"
                  />
                ) : null
              )}

              {/* Resume: LaTeX view / all other types: raw text */}
              {(!isResume || viewMode === 'latex') && (
                detail.output_text ? (
                  <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                    {detail.output_text}
                  </pre>
                ) : (
                  <p className="text-slate-400 text-sm text-center py-8">No output text stored for this entry.</p>
                )
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {!loading && !error && detail?.output_text && (
          <div className="flex items-center gap-2 px-6 py-3 border-t border-slate-200 shrink-0 flex-wrap">
            {/* Download PDF — resume only */}
            {isResume && pdfUrl && (
              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
              </button>
            )}

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1.5 transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download .{meta.ext}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  logs: GenerationLogEntry[]
  loading: boolean
}

export default function ActivityLog({ logs, loading }: Props) {
  const [selectedEntry, setSelectedEntry] = useState<GenerationLogEntry | null>(null)

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading activity…
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="py-10 text-center text-slate-400 text-sm">
        No generations yet. Start by tailoring a resume or writing a cover letter.
      </div>
    )
  }

  return (
    <>
      {selectedEntry && (
        <DetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}

      <div className="space-y-3">
        {logs.map((entry) => {
          const meta = TYPE_META[entry.type] ?? { label: entry.type, color: 'slate', icon: '📌', ext: 'txt' }

          return (
            <div
              key={entry.id}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${COLOR_MAP[meta.color]}`}
                  >
                    <span>{meta.icon}</span>
                    {meta.label}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(entry.generated_at)}</span>
                </div>
                <button
                  onClick={() => setSelectedEntry(entry)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View
                </button>
              </div>

              {entry.job_description && (
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  <span className="font-medium text-slate-500">JD: </span>
                  {truncate(entry.job_description)}
                </p>
              )}

              {entry.questions && entry.questions.length > 0 && (
                <p className="mt-2 text-xs text-slate-600">
                  <span className="font-medium text-slate-500">Questions: </span>
                  {entry.questions.slice(0, 2).join(' · ')}
                  {entry.questions.length > 2 && ` +${entry.questions.length - 2} more`}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
