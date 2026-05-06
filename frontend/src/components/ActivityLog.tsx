import { type GenerationLogEntry } from '../api/client'

const TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  resume: { label: 'Resume', color: 'indigo', icon: '📝' },
  cover_letter: { label: 'Cover Letter', color: 'violet', icon: '✉️' },
  star_answers: { label: 'STAR Answers', color: 'amber', icon: '⭐' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

function truncate(str: string | null, max = 120): string {
  if (!str) return '—'
  return str.length > max ? str.slice(0, max) + '…' : str
}

interface Props {
  logs: GenerationLogEntry[]
  loading: boolean
}

export default function ActivityLog({ logs, loading }: Props) {
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
    <div className="space-y-3">
      {logs.map((entry) => {
        const meta = TYPE_META[entry.type] ?? { label: entry.type, color: 'slate', icon: '📌' }
        const colorMap: Record<string, string> = {
          indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
          violet: 'bg-violet-50 border-violet-200 text-violet-700',
          amber: 'bg-amber-50 border-amber-200 text-amber-700',
          slate: 'bg-slate-50 border-slate-200 text-slate-700',
        }

        return (
          <div
            key={entry.id}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorMap[meta.color]}`}
              >
                <span>{meta.icon}</span>
                {meta.label}
              </span>
              <span className="text-xs text-slate-400">{formatDate(entry.generated_at)}</span>
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

            {entry.output_text && (
              <p className="mt-2 text-xs text-slate-400 italic leading-relaxed">
                {truncate(entry.output_text, 160)}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
