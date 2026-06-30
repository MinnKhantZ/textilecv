import { useState, useEffect } from 'react'
import ResumeTailor from './components/ResumeTailor'
import CoverLetterArchitect from './components/CoverLetterArchitect'
import StarGenerator from './components/StarGenerator'
import ProfileManager from './components/ProfileManager'
import OnboardingModal from './components/OnboardingModal'

type Tab = 'resume' | 'cover' | 'star' | 'profile'

const TABS: { id: Tab; label: string; description: string; color: string }[] = [
  {
    id: 'resume',
    label: 'Resume Tailor',
    description: 'Map your projects to any JD',
    color: 'indigo',
  },
  {
    id: 'cover',
    label: 'Cover Letter',
    description: 'Narrative-driven personal letter',
    color: 'violet',
  },
  {
    id: 'star',
    label: 'STAR Generator',
    description: 'Behavioral interview answers',
    color: 'amber',
  },
  {
    id: 'profile',
    label: 'Profile & Files',
    description: 'Upload data · view history',
    color: 'teal',
  },
]

const ACTIVE_CLASSES: Record<Tab, string> = {
  resume: 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50',
  cover: 'text-violet-600 border-b-2 border-violet-600 bg-violet-50',
  star: 'text-amber-600 border-b-2 border-amber-600 bg-amber-50',
  profile: 'text-teal-600 border-b-2 border-teal-600 bg-teal-50',
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('resume')
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('textilecv_onboarded')) {
      setShowOnboarding(true)
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      {showOnboarding && <OnboardingModal onSelect={() => setShowOnboarding(false)} />}
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-md">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">TextileCV</h1>
              <p className="text-slate-300 text-xs">
                GPT-5.4-mini · RAG · ChromaDB · text-embedding-3-small
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab Navigation ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex" aria-label="Features">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 px-4 text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? ACTIVE_CLASSES[tab.id]
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.label}
                <p
                  className={`text-xs mt-0.5 font-normal hidden sm:block ${
                    activeTab === tab.id ? 'opacity-80' : 'text-slate-400'
                  }`}
                >
                  {tab.description}
                </p>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'resume' && <ResumeTailor />}
        {activeTab === 'cover' && <CoverLetterArchitect />}
        {activeTab === 'star' && <StarGenerator />}
        {activeTab === 'profile' && <ProfileManager />}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-slate-400 text-center">
            All outputs are grounded in your personal data. The AI is instructed never to
            hallucinate skills or experiences.
          </p>
        </div>
      </footer>
    </div>
  )
}


