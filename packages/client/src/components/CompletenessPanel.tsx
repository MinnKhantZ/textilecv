import { useState, useEffect, useCallback } from 'react'
import { getProfile, setProfileType, type ProfileResponse, type ProfileType, type Criticality } from '../api/client'

const PROFILE_TYPE_OPTIONS: { id: ProfileType; label: string }[] = [
  { id: 'student', label: 'Student' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'design', label: 'Design' },
  { id: 'business', label: 'Business' },
  { id: 'academic', label: 'Academic' },
  { id: 'trades', label: 'Trades' },
  { id: 'other', label: 'Other' },
]

const CRITICALITY_STYLES: Record<Criticality, { dot: string; label: string }> = {
  critical: { dot: 'bg-red-400', label: 'text-red-600' },
  recommended: { dot: 'bg-amber-400', label: 'text-amber-600' },
  optional: { dot: 'bg-slate-300', label: 'text-slate-400' },
}

export default function CompletenessPanel({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingType, setSavingType] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await getProfile()
      setData(result)
    } catch {
      // profile may not exist yet
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const handleTypeChange = async (type: ProfileType) => {
    setSavingType(true)
    try {
      await setProfileType(type)
      await load()
    } catch {
      // ignore
    } finally {
      setSavingType(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-400">
        Loading profile completeness…
      </div>
    )
  }

  if (!data) return null

  const { completeness, profileType } = data
  const scoreColor =
    completeness.score >= 70 ? 'text-green-600' : completeness.score >= 40 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Profile Completeness</h3>
        <span className={`text-lg font-bold ${scoreColor}`}>{completeness.score}%</span>
      </div>

      {/* Profile type selector */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">Your background:</label>
        <select
          value={profileType}
          onChange={(e) => void handleTypeChange(e.target.value as ProfileType)}
          disabled={savingType}
          className="text-xs rounded-lg border border-slate-200 px-2 py-1 text-slate-700 focus:border-indigo-400 focus:outline-none"
        >
          {PROFILE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Field checks */}
      <div className="space-y-1.5">
        {completeness.fields.map((field) => {
          const style = CRITICALITY_STYLES[field.criticality]
          return (
            <div key={field.key} className="flex items-start gap-2 text-xs">
              <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${field.present ? 'bg-green-400' : style.dot}`} />
              <div className="flex-1">
                <span className={field.present ? 'text-slate-600' : style.label}>
                  {field.label}
                  {field.present ? ' ✓' : ''}
                </span>
                {!field.present && (
                  <p className="text-slate-400 text-[11px] mt-0.5">{field.tip}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {completeness.score < 100 && (
        <p className="text-[11px] text-slate-400 italic">
          Upload your experience and about-me files with the missing details, then re-upload to update this report.
        </p>
      )}
    </div>
  )
}
