import { useEffect, useState } from 'react'
import {
  changeVaultPassword,
  getAiSettings,
  lockVault,
  patchAiSettings,
  testAiConnection,
  type AiSettings,
} from '../api/client'
import { publishAiSettings } from '../lib/brand'

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'custom', label: 'OpenAI-compatible (custom base URL)' },
]

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
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confPw, setConfPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    getAiSettings()
      .then((nextSettings) => {
        setSettings(nextSettings)
        setProvider(nextSettings.provider)
        setModel(nextSettings.model)
        setBaseUrl(nextSettings.baseUrl)
        publishAiSettings(nextSettings)
      })
      .catch((err) =>
        setMsg({
          type: 'err',
          text: err instanceof Error ? err.message : 'Failed to load settings',
        })
      )
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    setTestResult(null)

    try {
      const updated = await patchAiSettings({
        provider,
        model,
        baseUrl,
        ...(apiKey ? { apiKey } : {}),
      })

      setSettings(updated)
      publishAiSettings(updated)
      setApiKey('')
      setMsg({ type: 'ok', text: 'Settings saved.' })
    } catch (err) {
      setMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to save settings',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSilent = async () => {
    const updated = await patchAiSettings({
      provider,
      model,
      baseUrl,
      ...(apiKey ? { apiKey } : {}),
    })

    setSettings(updated)
    publishAiSettings(updated)
    setApiKey('')
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      if (apiKey) {
        await handleSaveSilent()
      }

      const result = await testAiConnection()
      setTestResult(result)
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Test failed',
      })
    } finally {
      setTesting(false)
    }
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
      setPwMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to change password',
      })
    } finally {
      setPwSaving(false)
    }
  }

  const handleLock = async () => {
    try {
      await lockVault()
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Failed to lock' })
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-400">Loading settings...</p>
      </div>
    )
  }

  const keyPlaceholder = settings?.hasApiKey
    ? 'Saved API key (leave blank to keep it)'
    : 'Paste your API key'

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-800">AI Configuration</h2>
        <p className="mb-5 text-sm text-slate-500">
          Your API key is encrypted with your master password and stored locally. It
          never leaves your machine.
        </p>

        {msg && (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-sm ${
              msg.type === 'ok'
                ? 'border border-green-200 bg-green-50 text-green-700'
                : 'border border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Provider</label>
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {PROVIDERS.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Model</label>
            <input
              type="text"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="Enter the model ID you want TextileCV to use"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Base URL {provider === 'custom' && <span className="text-red-500">*</span>}
              <span className="font-normal text-slate-400">
                {' '}
                (optional, for OpenAI-compatible APIs)
              </span>
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={keyPlaceholder}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {settings?.hasApiKey && !apiKey && (
              <p className="mt-1 text-xs text-slate-400">
                A key is stored. Enter a new one to replace it.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save settings'}
            </button>
            <button
              onClick={() => void handleTest()}
              disabled={testing}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test connection'}
            </button>
          </div>

          {testResult && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                testResult.success
                  ? 'border border-green-200 bg-green-50 text-green-700'
                  : 'border border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-800">Vault Security</h2>
        <p className="mb-5 text-sm text-slate-500">
          Change your master password or lock the vault. The vault also locks
          automatically on every server restart.
        </p>

        {pwMsg && (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-sm ${
              pwMsg.type === 'ok'
                ? 'border border-green-200 bg-green-50 text-green-700'
                : 'border border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {pwMsg.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Current password
            </label>
            <input
              type="password"
              value={curPw}
              onChange={(event) => setCurPw(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">New password</label>
            <input
              type="password"
              value={newPw}
              onChange={(event) => setNewPw(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Confirm new password
            </label>
            <input
              type="password"
              value={confPw}
              onChange={(event) => setConfPw(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleChangePassword()
                }
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => void handleChangePassword()}
              disabled={pwSaving}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-900 disabled:opacity-50"
            >
              {pwSaving ? 'Changing...' : 'Change password'}
            </button>
            <button
              onClick={() => void handleLock()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Lock vault now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
