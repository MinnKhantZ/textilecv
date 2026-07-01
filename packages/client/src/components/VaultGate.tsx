import { useState, useEffect, useCallback } from 'react'
import {
  getVaultStatus,
  setupVault,
  unlockVault,
  onVaultLocked,
  type VaultStatus,
} from '../api/client'

type Mode = 'loading' | 'setup' | 'unlock'

export default function VaultGate({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>('loading')
  const [status, setStatus] = useState<VaultStatus | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // ── password fields ──
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const checkStatus = useCallback(async () => {
    try {
      const s = await getVaultStatus()
      setStatus(s)
      if (s.isUnlocked) {
        setMode('loading') // stay on main app (children render)
      } else if (s.isSetup) {
        setMode('unlock')
      } else {
        setMode('setup')
      }
    } catch {
      setError('Could not reach the TextileCV server. Is "textilecv start" running?')
      setMode('setup')
    }
  }, [])

  useEffect(() => {
    checkStatus()
    // If any protected call returns 423 (vault locked mid-session), flip back.
    const off = onVaultLocked(() => {
      setStatus({ isSetup: true, isUnlocked: false })
      setMode('unlock')
      setPassword('')
      setConfirm('')
    })
    return off
  }, [checkStatus])

  const handleSetup = async () => {
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await setupVault(password)
      setStatus({ isSetup: true, isUnlocked: true })
      setPassword('')
      setConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up vault')
    } finally {
      setBusy(false)
    }
  }

  const handleUnlock = async () => {
    setError('')
    if (!password) {
      setError('Enter your master password.')
      return
    }
    setBusy(true)
    try {
      await unlockVault(password)
      setStatus({ isSetup: true, isUnlocked: true })
      setPassword('')
      setConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock')
    } finally {
      setBusy(false)
    }
  }

  // Unlocked → render the main app
  if (status?.isUnlocked) {
    return <>{children}</>
  }

  const isSetup = mode === 'setup'

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          {/* ── Logo / title ── */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">TextileCV</h1>
              <p className="text-slate-400 text-xs">AI-powered career toolkit</p>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-slate-800 mb-1">
            {isSetup ? 'Create a master password' : 'Unlock your vault'}
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            {isSetup
              ? 'Your API key and data are encrypted at rest. This password unlocks them. Choose at least 8 characters — it is not stored and cannot be recovered.'
              : 'Enter your master password to decrypt your data and resume.'}
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <input
              type="password"
              placeholder="Master password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSetup) handleUnlock()
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              autoFocus
            />

            {isSetup && (
              <input
                type="password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSetup()
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            )}

            <button
              onClick={isSetup ? handleSetup : handleUnlock}
              disabled={busy}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {busy ? 'Working…' : isSetup ? 'Create vault' : 'Unlock'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          The vault locks on every server restart. Your OpenAI key is stored encrypted, never in plaintext.
        </p>
      </div>
    </div>
  )
}
