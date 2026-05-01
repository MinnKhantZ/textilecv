const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export interface GenerateResponse {
  compatible: true
  latex: string
  resumeId: string
}

export interface GenerateTextResponse {
  compatible: true
  result: string
}

export interface IncompatibleResponse {
  compatible: false
  reason: string
}

export type GenerateOrCheckResponse = GenerateResponse | IncompatibleResponse
export type GenerateTextOrCheckResponse = GenerateTextResponse | IncompatibleResponse

async function post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error((errorData as { error?: string }).error ?? `HTTP error ${response.status}`)
  }

  return response.json()
}

export const generateResume = (jobDescription: string, forceGenerate = false, preferences?: string) =>
  post<GenerateOrCheckResponse>('/generate-resume', { jobDescription, forceGenerate, ...(preferences?.trim() && { preferences }) })

export const getResumePdfUrl = (resumeId: string) => `${API_URL}/generate-resume/pdf/${encodeURIComponent(resumeId)}`

export const generateCoverLetter = (jobDescription: string, forceGenerate = false, preferences?: string) =>
  post<GenerateTextOrCheckResponse>('/generate-cover-letter', { jobDescription, forceGenerate, ...(preferences?.trim() && { preferences }) })

export const generateStarAnswers = (questions: string[]) =>
  post<{ result: string }>('/generate-star-answers', { questions })
