import { useEffect, useState } from 'react'
import { Settings as SettingsIcon, UserRound } from 'lucide-react'
import BrandMark from './components/BrandMark'
import CoverLetterArchitect from './components/CoverLetterArchitect'
import OnboardingModal from './components/OnboardingModal'
import ProfileManager from './components/ProfileManager'
import ResumeTailor from './components/ResumeTailor'
import Settings from './components/Settings'
import StarGenerator from './components/StarGenerator'
import { useActiveModel } from './hooks/useActiveModel'
import { BRAND_NAME, BRAND_TAGLINE } from './lib/brand'

type Tab = 'resume' | 'cover' | 'star'
type UtilityPanel = 'settings' | 'profile' | null

const TABS: { id: Tab; label: string; description: string }[] = [
  {
    id: 'resume',
    label: 'Resume Tailor',
    description: 'Map your projects to any job description',
  },
  {
    id: 'cover',
    label: 'Cover Letter',
    description: 'Shape a narrative-driven personal letter',
  },
  {
    id: 'star',
    label: 'STAR Generator',
    description: 'Draft interview answers from your experience',
  },
]

const ACTIVE_CLASSES: Record<Tab, string> = {
  resume: 'border-b-2 border-indigo-600 bg-indigo-50 text-indigo-700',
  cover: 'border-b-2 border-violet-600 bg-violet-50 text-violet-700',
  star: 'border-b-2 border-amber-500 bg-amber-50 text-amber-700',
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('resume')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [activePanel, setActivePanel] = useState<UtilityPanel>(null)
  const activeModel = useActiveModel()

  useEffect(() => {
    if (!localStorage.getItem('textilecv_onboarded')) {
      setShowOnboarding(true)
    }
  }, [])

  useEffect(() => {
    if (!activePanel) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActivePanel(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activePanel])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(114,143,255,0.22),_transparent_34%),linear-gradient(180deg,_#f5f7ff_0%,_#edf2ff_45%,_#f8fafc_100%)]">
      {showOnboarding && <OnboardingModal onSelect={() => setShowOnboarding(false)} />}

      {activePanel && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 p-4 pt-16 backdrop-blur-sm sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setActivePanel(null)
            }
          }}
        >
          <div className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-[0_30px_120px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {activePanel === 'settings' ? 'Settings' : 'Profile & files'}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  {activePanel === 'settings'
                    ? 'AI providers and vault security'
                    : 'Upload source material and review history'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                aria-label={`Close ${activePanel}`}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                  <path
                    d="M5 5l10 10M15 5 5 15"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="max-h-[calc(100vh-8rem)] overflow-y-auto bg-slate-50 p-4 sm:p-6">
              {activePanel === 'settings' ? <Settings /> : <ProfileManager />}
            </div>
          </div>
        </div>
      )}

      <header className="overflow-hidden border-b border-[#24356f] bg-[linear-gradient(135deg,#07163b_0%,#10265f_50%,#173988_100%)] text-white shadow-[0_22px_80px_rgba(7,22,59,0.36)]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <BrandMark
                sizeClassName="h-14 w-14"
                imageClassName="h-12 w-12 rounded-[1.15rem]"
                frameClassName="rounded-[1.6rem] border border-white/15 bg-white/8 p-1 shadow-[0_22px_60px_rgba(5,12,37,0.4)] backdrop-blur"
              />
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{BRAND_NAME}</h1>
                </div>
                <p className="text-sm text-[#d4defe]">{BRAND_TAGLINE}</p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur sm:flex-row sm:items-center xl:w-auto xl:min-w-[28rem]">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#9fb3ff]">
                  Current AI model
                </p>
                <p className="mt-1 text-sm font-medium text-white/90">
                  <span className="sm:hidden">{activeModel}</span>
                  <span className="hidden sm:inline">
                    {activeModel} powers your resumes, letters, and interview prep.
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:ml-auto sm:justify-end">
                <button
                  type="button"
                  onClick={() => setActivePanel('profile')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white/90 shadow-[0_18px_50px_rgba(5,12,37,0.22)] transition hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  <UserRound className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
                  Profile & Files
                </button>
                <button
                  type="button"
                  onClick={() => setActivePanel('settings')}
                  aria-label="Open settings"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white/90 shadow-[0_18px_50px_rgba(5,12,37,0.3)] transition hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  <SettingsIcon className="h-5 w-5" aria-hidden="true" strokeWidth={1.8} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-10 border-b border-white/60 bg-white/80 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex" aria-label="Features">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-4 text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? ACTIVE_CLASSES[tab.id]
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {tab.label}
                <p
                  className={`mt-0.5 hidden text-xs font-normal sm:block ${
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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'resume' && <ResumeTailor />}
        {activeTab === 'cover' && <CoverLetterArchitect />}
        {activeTab === 'star' && <StarGenerator />}
      </main>

      <footer className="mt-16 border-t border-white/60 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-slate-400">
            All outputs are grounded in your personal data. The AI is instructed never to
            hallucinate skills or experiences.
          </p>
        </div>
      </footer>
    </div>
  )
}
