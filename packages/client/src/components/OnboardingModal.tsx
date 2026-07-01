import { useState } from 'react'
import { BookOpen, ChartColumn, Cog, GraduationCap, Paintbrush, Sparkles, Wrench } from 'lucide-react'
import { setProfileType, type ProfileType } from '../api/client'

const PROFILE_TYPES: { id: ProfileType; label: string; icon: typeof GraduationCap; desc: string }[] = [
  { id: 'student', label: 'Student', icon: GraduationCap, desc: 'Recent grad or current student' },
  { id: 'engineering', label: 'Engineering', icon: Cog, desc: 'Software, mechanical, electrical' },
  { id: 'design', label: 'Design', icon: Paintbrush, desc: 'UI/UX, graphic, product design' },
  { id: 'business', label: 'Business', icon: ChartColumn, desc: 'Management, finance, marketing' },
  { id: 'academic', label: 'Academic', icon: BookOpen, desc: 'Research, teaching, postdoc' },
  { id: 'trades', label: 'Trades', icon: Wrench, desc: 'Licensed trades, hands-on work' },
  { id: 'other', label: 'Other', icon: Sparkles, desc: 'Something else entirely' },
]

interface Props {
  onSelect: () => void
}

export default function OnboardingModal({ onSelect }: Props) {
  const [saving, setSaving] = useState(false)

  const handleSelect = async (type: ProfileType) => {
    setSaving(true)
    try {
      await setProfileType(type)
    } catch {
      // ignore - type can be set later in the profile panel
    } finally {
      localStorage.setItem('textilecv_onboarded', '1')
      onSelect()
    }
  }

  const handleSkip = () => {
    localStorage.setItem('textilecv_onboarded', '1')
    onSelect()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
        <h2 className="text-center text-xl font-bold text-slate-800">What best describes you?</h2>
        <p className="mb-6 mt-2 text-center text-sm text-slate-500">
          This helps us tailor guidance on what to include in your resume. You can change this anytime.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {PROFILE_TYPES.map((pt) => (
            <button
              key={pt.id}
              onClick={() => void handleSelect(pt.id)}
              disabled={saving}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
            >
              <pt.icon className="h-6 w-6 shrink-0 text-slate-600" aria-hidden="true" strokeWidth={1.8} />
              <div>
                <p className="text-sm font-semibold text-slate-800">{pt.label}</p>
                <p className="text-xs text-slate-400">{pt.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleSkip}
          disabled={saving}
          className="mt-5 w-full text-xs text-slate-400 transition-colors hover:text-slate-600"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
