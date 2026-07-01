import { useState, useEffect } from 'react'
import {
  getAiSettings,
  patchAiSettings,
  testAiConnection,
  changeVaultPassword,
  lockVault,
  type AiSettings,
} from '../api/client'

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'custom', label: 'OpenAI-compatible (custom base URL)' },
]

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  custom: 'gpt-4o-mini',
}

export default function Settings() {
  const [settings, setSettings] = useState<AiSettings | null>(null)
  const [provider, setProvider] = useState('openai')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // ── change password ──
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confPw, setConfPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    getAiSettings()
      .then((s) => {
        setSettings(s)
        setProvider(s.provider)
        setModel(s.model)
        setBaseUrl(s.baseUrl)
      })
      .catch((err) => setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Failed to load settings' }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    setTestResult(null)
    try {
      const patch: { provider?: string; model?: string; baseUrl?: string; apiKey?: string } = {
        provider,
        model,
        baseUrl,
      }
      if (apiKey) patch.apiKey = apiKey
      const updated = await patchAiSettings(patch)
      setSettings(updated)
      setApiKey('')
      setMsg({ type: 'ok', text: 'Settings saved.' })
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      // If the user entered a new key, persist it first so the test uses it.
      if (apiKey) await handleSaveSilent()
      const result = await testAiConnection()
      setTestResult(result)
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Test failed' })
    } finally {
      setTesting(false)
    }
  }

  const handleSaveSilent = async () => {
    const updated = await patchAiSettings({ provider, model, baseUrl, ...(apiKey ? { apiKey } : {}) })
    setSettings(updated)
    setApiKey('')
  }

  const handleChangePassword = async () => {
    setPwMsg(null)
    if (newPw.length < 8) {
      setPwMsg({ type: 'err', text: 'New password must be at least 8 characters.' })
      return
    }
    if (newPw !== confPw) {
      setPwMsg({ type: 'err', text: 'New passwords do not match.' })
      return
    }
    setPwSaving(true)
    try {
      await changeVaultPassword(curPw, newPw)
      setCurPw('')
      setNewPw('')
      setConfPw('')
      setPwMsg({ type: 'ok', text: 'Master password changed.' })
    } catch (err) {
      setPwMsg({ type: 'err', text: err instanceof Error ? err.message : 'Failed to change password' })
    } finally {
      setPwSaving(false)
    }
  }

  const handleLock = async () => {
    try {
      await lockVault()
      // The onVaultLocked handler in VaultGate will flip the UI to unlock.
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Failed to lock' })
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-sm text-slate-400">Loading settings…</p>
      </div>
    )
  }

  const keyPlaceholder = settings?.hasApiKey ? '•••••••• (leave blank to keep)' : 'sk-…'

  return (
    <div className="space-y-6">
      {/* ── AI configuration ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">AI Configuration</h2>
        <p className="text-sm text-slate-500 mb-5">
          Your API key is encrypted with your master password and stored locally. It never leaves your machine.
        </p>

        {msg && (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-sm ${
              msg.type === 'ok'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="space-y-4">
          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => {
                const p = e.target.value
                setProvider(p)
                if (!model) setModel(DEFAULT_MODELS[p] || '')
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={DEFAULT_MODELS[provider] || 'gpt-4o-mini'}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Base URL {provider === 'custom' && <span className="text-red-500">*</span>}
              <span className="font-normal text-slate-400"> (optional, for OpenAI-compatible APIs)</span>
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* API key */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={keyPlaceholder}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            {settings?.hasApiKey && !apiKey && (
              <p className="text-xs text-slate-400 mt-1">A key is stored. Enter a new one to replace it.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
            <button
              onClick={handleTest}
              disabled={testing}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              {testing ? 'Testing…' : 'Test connection'}
            </button>
          </div>

          {testResult && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                testResult.success
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      {/* ── Security ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Vault Security</h2>
        <p className="text-sm text-slate-500 mb-5">
          Change your master password or lock the vault. The vault also locks automatically on every server restart.
        </p>

        {pwMsg && (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-sm ${
              pwMsg.type === 'ok'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {pwMsg.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current password</label>
            <input
              type="password"
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm new password</label>
            <input
              type="password"
              value={confPw}
              onChange={(e) => setConfPw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleChangePassword()
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleChangePassword}
              disabled={pwSaving}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50 transition-colors"
            >
              {pwSaving ? 'Changing…' : 'Change password'}
            </button>
            <button
              onClick={handleLock}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Lock vault now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
