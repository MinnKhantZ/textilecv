import { useState } from 'react'
import { setProfileType, type ProfileType } from '../api/client'

const PROFILE_TYPES: { id: ProfileType; label: string; icon: string; desc: string }[] = [
  { id: 'student', label: 'Student', icon: '🎓', desc: 'Recent grad or current student' },
  { id: 'engineering', label: 'Engineering', icon: '⚙️', desc: 'Software, mechanical, electrical' },
  { id: 'design', label: 'Design', icon: '🎨', desc: 'UI/UX, graphic, product design' },
  { id: 'business', label: 'Business', icon: '📊', desc: 'Management, finance, marketing' },
  { id: 'academic', label: 'Academic', icon: '📚', desc: 'Research, teaching, postdoc' },
  { id: 'trades', label: 'Trades', icon: '🔧', desc: 'Licensed trades, hands-on work' },
  { id: 'other', label: 'Other', icon: '✨', desc: 'Something else entirely' },
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
      // ignore — type can be set later in the profile panel
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-8">
        <h2 className="text-xl font-bold text-slate-800 text-center">What best describes you?</h2>
        <p className="text-sm text-slate-500 text-center mt-2 mb-6">
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
              <span className="text-2xl">{pt.icon}</span>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{pt.label}</p>
                <p className="text-xs text-slate-400">{pt.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleSkip}
          disabled={saving}
          className="w-full mt-5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
