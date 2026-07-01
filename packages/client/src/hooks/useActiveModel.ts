import { useEffect, useState } from 'react'
import { getAiSettings } from '../api/client'
import {
  AI_SETTINGS_EVENT,
  getActiveModelLabel,
  publishAiSettings,
  readCachedModelLabel,
} from '../lib/brand'

export function useActiveModel() {
  const [modelLabel, setModelLabel] = useState(readCachedModelLabel)

  useEffect(() => {
    let cancelled = false

    getAiSettings()
      .then((settings) => {
        if (cancelled) return
        setModelLabel(publishAiSettings({ model: settings.model }))
      })
      .catch(() => {
        if (!cancelled) {
          setModelLabel(readCachedModelLabel())
        }
      })

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ model?: string }>).detail
      setModelLabel(getActiveModelLabel(detail?.model))
    }

    window.addEventListener(AI_SETTINGS_EVENT, handleUpdate)

    return () => {
      cancelled = true
      window.removeEventListener(AI_SETTINGS_EVENT, handleUpdate)
    }
  }, [])

  return modelLabel
}
