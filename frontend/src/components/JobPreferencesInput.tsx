import { useState } from 'react'

interface JobPreferencesInputProps {
  value: string
  onChange: (value: string) => void
}

export default function JobPreferencesInput({ value, onChange }: JobPreferencesInputProps) {
  const [open, setOpen] = useState(false)
  const hasContent = value.trim().length > 0

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors duration-150"
        aria-expanded={open}
      >
        <svg
          className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span>Job preferences</span>
        {hasContent && !open && (
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" aria-label="preferences active" />
        )}
      </button>

      {open && (
        <div className="mt-2">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. Remote only, Europe-based, Series A startup, fintech sector…"
            maxLength={500}
            rows={3}
            className="w-full p-3 border border-slate-200 rounded-lg text-xs text-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder:text-slate-300 bg-slate-50"
          />
          <div className="flex justify-between mt-1">
            <p className="text-xs text-slate-400">
              Saved automatically · applied to compatibility check
            </p>
            <span className="text-xs text-slate-300">{value.length} / 500</span>
          </div>
        </div>
      )}
    </div>
  )
}
