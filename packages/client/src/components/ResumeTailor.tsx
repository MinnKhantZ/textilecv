import { useState } from 'react'
import { generateResume, getResumePdfUrl } from '../api/client'
import { useActiveModel } from '../hooks/useActiveModel'
import { useJobPreferences } from '../hooks/useJobPreferences'
import JobPreferencesInput from './JobPreferencesInput'

export default function ResumeTailor() {
  const { preferences, setPreferences } = useJobPreferences()
  const activeModel = useActiveModel()
  const [jd, setJd] = useState('')
  const [latexSource, setLatexSource] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')
  const [resumeId, setResumeId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState<'checking' | 'generating'>('checking')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'pdf' | 'latex'>('pdf')
  const [compatibilityWarning, setCompatibilityWarning] = useState<string | null>(null)

  const run = async (forceGenerate: boolean) => {
    setIsLoading(true)
    setError('')
    setLatexSource('')
    setPdfUrl('')
    setResumeId('')
    setCompatibilityWarning(null)
    setLoadingPhase(forceGenerate ? 'generating' : 'checking')

    try {
      const data = await generateResume(jd, forceGenerate, preferences)
      if (!data.compatible) {
        setCompatibilityWarning(data.reason)
      } else {
        setLatexSource(data.latex)
        setResumeId(data.resumeId)
        setPdfUrl(getResumePdfUrl(data.resumeId))
        setViewMode('pdf')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate resume. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!jd.trim()) return
    await run(false)
  }

  const handleJdChange = (value: string) => {
    setJd(value)
    if (compatibilityWarning) setCompatibilityWarning(null)
  }

  const handleCopyLatex = async () => {
    if (!latexSource) return
    try {
      await navigator.clipboard.writeText(latexSource)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = latexSource
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
            <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Job Description</h2>
        </div>
        <p className="mb-4 ml-10 text-xs text-slate-500">
          Paste the full JD so the AI can map your projects to the required skills.
        </p>

        <form onSubmit={(event) => void handleSubmit(event)}>
          <textarea
            value={jd}
            onChange={(event) => handleJdChange(event.target.value)}
            placeholder="Paste the full job description here..."
            className="h-80 w-full resize-none rounded-lg border border-slate-200 p-4 text-sm text-slate-700 placeholder:text-slate-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            maxLength={15000}
          />

          {compatibilityWarning && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="mb-1 text-sm font-medium text-amber-800">Not a strong match</p>
              <p className="mb-3 text-xs text-amber-700">{compatibilityWarning}</p>
              <button
                type="button"
                onClick={() => void run(true)}
                disabled={isLoading}
                className="rounded-lg border border-amber-300 bg-amber-100 px-4 py-1.5 text-xs font-medium text-amber-800 transition-colors duration-200 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue Anyway
              </button>
            </div>
          )}

          <JobPreferencesInput value={preferences} onChange={setPreferences} />

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">{jd.length.toLocaleString()} / 15,000</span>
            <button
              type="submit"
              disabled={isLoading || !jd.trim()}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {loadingPhase === 'checking' ? 'Checking...' : 'Generating...'}
                </>
              ) : (
                'Generate Resume'
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="flex min-h-96 flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Tailored Resume</h2>
          </div>

          {resumeId && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('pdf')}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                  viewMode === 'pdf'
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                PDF Preview
              </button>
              <button
                onClick={() => setViewMode('latex')}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                  viewMode === 'latex'
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                LaTeX Source
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-slate-400">
              <svg className="h-8 w-8 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-sm font-medium">{activeModel} is working on it...</p>
              <p className="text-xs">This usually takes 15-30 seconds.</p>
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50 p-4">
              <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : resumeId ? (
            <div className="h-full">
              <div className="mb-3 flex items-center gap-2">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={`tailored-resume-${resumeId}.pdf`}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  Download PDF
                </a>
                <button
                  onClick={() => void handleCopyLatex()}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                    copied
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {copied ? 'Copied LaTeX' : 'Copy LaTeX'}
                </button>
              </div>

              {viewMode === 'pdf' ? (
                <iframe
                  src={pdfUrl}
                  title="Tailored resume PDF preview"
                  className="h-[42rem] w-full rounded-lg border border-slate-200"
                />
              ) : (
                <pre className="h-[42rem] w-full overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800">
                  {latexSource}
                </pre>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-slate-300">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm">Your tailored resume will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
