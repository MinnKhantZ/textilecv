import type { AiSettings } from '../api/client'

export const BRAND_NAME = 'TextileCV'
export const BRAND_TAGLINE = 'AI-powered career toolkit'
export const AI_SETTINGS_EVENT = 'textilecv:ai-settings-updated'

const MODEL_STORAGE_KEY = 'textilecv_active_model'

export function getActiveModelLabel(model?: string | null) {
  const trimmed = model?.trim()
  return trimmed ? trimmed : 'your selected model'
}

export function readCachedModelLabel() {
  if (typeof window === 'undefined') {
    return getActiveModelLabel()
  }

  try {
    return getActiveModelLabel(window.localStorage.getItem(MODEL_STORAGE_KEY))
  } catch {
    return getActiveModelLabel()
  }
}

export function publishAiSettings(settings: Pick<AiSettings, 'model'>) {
  const modelLabel = getActiveModelLabel(settings.model)

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(MODEL_STORAGE_KEY, settings.model.trim())
    } catch {
      // localStorage is optional in some environments.
    }

    window.dispatchEvent(
      new CustomEvent(AI_SETTINGS_EVENT, {
        detail: { model: modelLabel },
      })
    )
  }

  return modelLabel
}
