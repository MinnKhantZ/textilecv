import { useCallback, useEffect, useState } from 'react'
import {
  getVaultStatus,
  onVaultLocked,
  setupVault,
  unlockVault,
  type VaultStatus,
} from '../api/client'
import { BRAND_NAME, BRAND_TAGLINE } from '../lib/brand'
import BrandMark from './BrandMark'

type Mode = 'loading' | 'setup' | 'unlock'

export default function VaultGate({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>('loading')
  const [status, setStatus] = useState<VaultStatus | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const checkStatus = useCallback(async () => {
    try {
      const nextStatus = await getVaultStatus()
      setStatus(nextStatus)

      if (nextStatus.isUnlocked) {
        setMode('loading')
      } else if (nextStatus.isSetup) {
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
    void checkStatus()

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

  if (status?.isUnlocked) {
    return <>{children}</>
  }

  const isSetup = mode === 'setup'

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(110,147,255,0.28),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.16),_transparent_28%),linear-gradient(180deg,_#071327_0%,_#0b1834_52%,_#08111f_100%)] px-4 py-8 text-white"
      style={{ colorScheme: 'dark' }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,transparent_34%,rgba(255,255,255,0.02)_100%)]" />
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-[1.9rem] border border-white/12 bg-slate-950/72 p-8 shadow-[0_28px_100px_rgba(2,6,23,0.6)] backdrop-blur-xl">
          <div className="mb-6 flex items-center gap-3">
            <BrandMark frameClassName="rounded-[1.45rem] border border-white/14 bg-white/8 p-1.5 shadow-[0_18px_50px_rgba(2,6,23,0.35)] backdrop-blur" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white">{BRAND_NAME}</h1>
              <p className="text-xs text-slate-300">{BRAND_TAGLINE}</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="mb-2 text-lg font-semibold text-white">
              {isSetup ? 'Create a master password' : 'Unlock your vault'}
            </h2>
            <p className="text-sm leading-6 text-slate-300">
              {isSetup
                ? 'Your API key and data are encrypted at rest. This password unlocks them. Choose at least 8 characters; it is not stored and cannot be recovered.'
                : 'Enter your master password to decrypt your data and resume.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <input
              type="password"
              placeholder="Master password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !isSetup) {
                  void handleUnlock()
                }
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-3 text-sm text-white caret-white placeholder:text-slate-400 outline-none transition focus:border-sky-300/40 focus:bg-slate-900/85 focus:ring-2 focus:ring-sky-400/20"
              autoFocus
            />

            {isSetup && (
              <input
                type="password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleSetup()
                  }
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-3 text-sm text-white caret-white placeholder:text-slate-400 outline-none transition focus:border-sky-300/40 focus:bg-slate-900/85 focus:ring-2 focus:ring-sky-400/20"
              />
            )}

            <button
              onClick={() => void (isSetup ? handleSetup() : handleUnlock())}
              disabled={busy}
              className="w-full rounded-xl bg-[linear-gradient(135deg,#60a5fa_0%,#3b82f6_48%,#2563eb_100%)] px-3 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(37,99,235,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Working...' : isSetup ? 'Create vault' : 'Unlock'}
            </button>
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-slate-400">
            The vault locks on every server restart. Your OpenAI key is stored encrypted,
            never in plaintext.
          </p>
        </div>
      </div>
    </div>
  )
}
