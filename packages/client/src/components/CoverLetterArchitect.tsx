import { useState } from 'react'
import OutputPanel from './OutputPanel'
import { generateCoverLetter } from '../api/client'
import { useJobPreferences } from '../hooks/useJobPreferences'
import JobPreferencesInput from './JobPreferencesInput'

export default function CoverLetterArchitect() {
  const { preferences, setPreferences } = useJobPreferences()
  const [jd, setJd] = useState('')
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState<'checking' | 'generating'>('checking')
  const [error, setError] = useState('')
  const [compatibilityWarning, setCompatibilityWarning] = useState<string | null>(null)

  const run = async (forceGenerate: boolean) => {
    setIsLoading(true)
    setError('')
    setOutput('')
    setCompatibilityWarning(null)
    setLoadingPhase(forceGenerate ? 'generating' : 'checking')

    try {
      const data = await generateCoverLetter(jd, forceGenerate, preferences)
      if (!data.compatible) {
        setCompatibilityWarning(data.reason)
      } else {
        setOutput(data.result)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate cover letter. Please try again.'
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
            <svg
              className="w-4 h-4 text-violet-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Job Description</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4 ml-10">
          Include company mission and values for a more authentic, targeted letter
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            value={jd}
            onChange={(e) => handleJdChange(e.target.value)}
            placeholder="Paste the full job description here. Include the company's mission statement, team description, and any values mentioned…"
            className="w-full h-80 p-4 border border-slate-200 rounded-lg text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-slate-300"
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
              className="px-6 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
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
                  {loadingPhase === 'checking' ? 'Checking…' : 'Writing…'}
                </>
              ) : (
                'Generate Cover Letter'
              )}
            </button>
          </div>
        </form>
      </div>

      <OutputPanel
        content={output}
        isLoading={isLoading}
        error={error}
        title="Cover Letter"
        emptyMessage="Your personalized cover letter will appear here"
      />
    </div>
  )
}
