import { useState, useEffect } from 'react'

const STORAGE_KEY = 'textilecv_job_preferences'

export function useJobPreferences() {
  const [preferences, setPreferencesState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? ''
    } catch {
      return ''
    }
  })

  useEffect(() => {
    try {
      if (preferences) {
        localStorage.setItem(STORAGE_KEY, preferences)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // localStorage unavailable — silent fail
    }
  }, [preferences])

  return { preferences, setPreferences: setPreferencesState }
}
