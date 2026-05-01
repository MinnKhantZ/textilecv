import { useState } from 'react'
import { generateResume, getResumePdfUrl } from '../api/client'
import { useJobPreferences } from '../hooks/useJobPreferences'
import JobPreferencesInput from './JobPreferencesInput'

export default function ResumeTailor() {
  const { preferences, setPreferences } = useJobPreferences()
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
      setError(
        err instanceof Error ? err.message : 'Failed to generate resume. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
            <svg
              className="w-4 h-4 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
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
        <p className="text-xs text-slate-500 mb-4 ml-10">
          Paste the full JD — the AI maps your projects to the required skills
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            value={jd}
            onChange={(e) => handleJdChange(e.target.value)}
            placeholder="Paste the full job description here…"
            className="w-full h-80 p-4 border border-slate-200 rounded-lg text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-300"
            maxLength={15000}
          />

          {compatibilityWarning && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-800 mb-1">Not a strong match</p>
              <p className="text-xs text-amber-700 mb-3">{compatibilityWarning}</p>
              <button
                type="button"
                onClick={() => run(true)}
                disabled={isLoading}
                className="px-4 py-1.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-lg border border-amber-300 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Continue Anyway
              </button>
            </div>
          )}

          <JobPreferencesInput value={preferences} onChange={setPreferences} />

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-slate-400">{jd.length.toLocaleString()} / 15,000</span>
            <button
              type="submit"
              disabled={isLoading || !jd.trim()}
              className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {loadingPhase === 'checking' ? 'Checking…' : 'Generating…'}
                </>
              ) : (
                'Generate Resume'
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-96">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
                  viewMode === 'pdf'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                PDF Preview
              </button>
              <button
                onClick={() => setViewMode('latex')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
                  viewMode === 'latex'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                LaTeX Source
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 py-16">
              <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-sm font-medium">GPT-4o is working on it…</p>
              <p className="text-xs">This usually takes 15–30 seconds</p>
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
              <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <div className="flex items-center gap-2 mb-3">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={`tailored-resume-${resumeId}.pdf`}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Download PDF
                </a>
                <button
                  onClick={handleCopyLatex}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
                    copied
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {copied ? 'Copied LaTeX' : 'Copy LaTeX'}
                </button>
              </div>

              {viewMode === 'pdf' ? (
                <iframe
                  src={pdfUrl}
                  title="Tailored resume PDF preview"
                  className="w-full h-[42rem] border border-slate-200 rounded-lg"
                />
              ) : (
                <pre className="w-full h-[42rem] overflow-auto p-4 border border-slate-200 rounded-lg bg-slate-50 text-xs text-slate-800 whitespace-pre-wrap">
                  {latexSource}
                </pre>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-300 py-16">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
