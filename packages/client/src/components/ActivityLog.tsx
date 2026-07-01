import { useState, useEffect, useRef } from 'react'
import { CircleCheck, Copy, Eye, FilePenLine, FileText, LoaderCircle, Mail, Paperclip, Download } from 'lucide-react'
import { type GenerationLogEntry, type GenerationLogDetail, getLogDetail, compileResumePdf } from '../api/client'

const TYPE_META: Record<string, { label: string; color: string; icon: typeof FileText; ext: string }> = {
  resume: { label: 'Resume', color: 'indigo', icon: FileText, ext: 'tex' },
  cover_letter: { label: 'Cover Letter', color: 'violet', icon: Mail, ext: 'md' },
  star_answers: { label: 'STAR Answers', color: 'amber', icon: FilePenLine, ext: 'md' },
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
  return str.length > max ? `${str.slice(0, max)}…` : str
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
  const meta = TYPE_META[entry.type] ?? { label: entry.type, color: 'slate', icon: Paperclip, ext: 'txt' }
  const isResume = entry.type === 'resume'

  const [detail, setDetail] = useState<GenerationLogDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'pdf' | 'latex'>('pdf')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isCompiling, setIsCompiling] = useState(false)
  const [compileError, setCompileError] = useState('')
  const pdfUrlRef = useRef<string | null>(null)

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${COLOR_MAP[meta.color]}`}>
              <meta.icon className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />
              {meta.label}
            </span>
            <span className="text-xs text-slate-400">{formatDate(entry.generated_at)}</span>
            {isResume && !loading && detail?.output_text && (
              <div className="ml-2 flex items-center gap-1">
                <button
                  onClick={() => setViewMode('pdf')}
                  className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
                    viewMode === 'pdf'
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  PDF Preview
                </button>
                <button
                  onClick={() => setViewMode('latex')}
                  className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
                    viewMode === 'latex'
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  LaTeX
                </button>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-slate-600"
            aria-label="Close"
          >
            <CircleCheck className="h-5 w-5 rotate-45" aria-hidden="true" strokeWidth={1.9} />
          </button>
        </div>

        <div className="shrink-0 space-y-1 border-b border-slate-100 bg-slate-50 px-6 py-3">
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

        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          {loading && (
            <div className="flex justify-center gap-2 py-8 text-slate-400">
              <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" strokeWidth={2} />
              Loading...
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {!loading && !error && detail && (
            <>
              {isResume && viewMode === 'pdf' && (
                isCompiling ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
                    <LoaderCircle className="h-6 w-6 animate-spin text-indigo-500" aria-hidden="true" strokeWidth={2} />
                    <p className="text-sm">Compiling PDF...</p>
                  </div>
                ) : compileError ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                    Could not compile PDF: {compileError}. Showing LaTeX source instead.
                  </div>
                ) : pdfUrl ? (
                  <iframe
                    src={pdfUrl}
                    title="Resume PDF preview"
                    className="h-[56rem] w-full rounded-lg border border-slate-200"
                  />
                ) : null
              )}

              {(!isResume || viewMode === 'latex') && (
                detail.output_text ? (
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-700">
                    {detail.output_text}
                  </pre>
                ) : (
                  <p className="py-8 text-center text-sm text-slate-400">No output text stored for this entry.</p>
                )
              )}
            </>
          )}
        </div>

        {!loading && !error && detail?.output_text && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 px-6 py-3">
            {isResume && pdfUrl && (
              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2.2} />
                Download PDF
              </button>
            )}

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
            >
              {copied ? (
                <>
                  <CircleCheck className="h-3.5 w-3.5 text-green-500" aria-hidden="true" strokeWidth={2.2} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2.2} />
                  Copy
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2.2} />
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
      <div className="flex justify-center gap-2 py-8 text-slate-400">
        <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" strokeWidth={2} />
        Loading activity...
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-400">
        No generations yet. Start by tailoring a resume or writing a cover letter.
      </div>
    )
  }

  return (
    <>
      {selectedEntry && <DetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />}

      <div className="space-y-3">
        {logs.map((entry) => {
          const meta = TYPE_META[entry.type] ?? { label: entry.type, color: 'slate', icon: Paperclip, ext: 'txt' }

          return (
            <div key={entry.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${COLOR_MAP[meta.color]}`}>
                    <meta.icon className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />
                    {meta.label}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(entry.generated_at)}</span>
                </div>
                <button
                  onClick={() => setSelectedEntry(entry)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2.2} />
                  View
                </button>
              </div>

              {entry.job_description && (
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
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
