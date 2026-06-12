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

export interface UploadStatus {
  original_filename: string
  uploaded_at: string
  file_size: number
}

export interface IngestState {
  status: 'idle' | 'running' | 'done' | 'error'
  lastRun: string | null
  docCount: number
  sources: string[]
  error: string | null
}

export interface UploadsStatusResponse {
  files: Record<string, UploadStatus>
  ingest: IngestState
}

export interface GenerationLogEntry {
  id: number
  type: string
  job_description: string | null
  questions: string[] | null
  compatible: number
  generated_at: string
  preferences: string | null
}

export interface GenerationLogDetail extends GenerationLogEntry {
  output_text: string | null
  artifact_path: string | null
}

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

/**
 * Compiles raw LaTeX source server-side and returns a local blob URL for the resulting PDF.
 * Used by the activity log to render historical resume entries as PDF previews.
 * The caller is responsible for calling URL.revokeObjectURL() when done.
 */
export async function compileResumePdf(latex: string): Promise<string> {
  const response = await fetch(`${API_URL}/generate-resume/compile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latex }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error((errorData as { error?: string }).error ?? `HTTP error ${response.status}`)
  }

  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

export const generateCoverLetter = (jobDescription: string, forceGenerate = false, preferences?: string) =>
  post<GenerateTextOrCheckResponse>('/generate-cover-letter', { jobDescription, forceGenerate, ...(preferences?.trim() && { preferences }) })

export const generateStarAnswers = (questions: string[]) =>
  post<{ result: string }>('/generate-star-answers', { questions })

// ── Uploads ──────────────────────────────────────────────────────────────────

export async function uploadFile(fileType: string, file: File): Promise<void> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_URL}/uploads/${encodeURIComponent(fileType)}`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error((errorData as { error?: string }).error ?? `HTTP error ${response.status}`)
  }
}

export async function getUploadsStatus(): Promise<UploadsStatusResponse> {
  const response = await fetch(`${API_URL}/uploads/status`)
  if (!response.ok) throw new Error(`HTTP error ${response.status}`)
  return response.json()
}

export const getSampleUrl = (fileType: string) =>
  `${API_URL}/uploads/samples/${encodeURIComponent(fileType)}`

// ── Logs ─────────────────────────────────────────────────────────────────────

export async function getGenerationLogs(limit = 50): Promise<GenerationLogEntry[]> {
  const response = await fetch(`${API_URL}/logs?limit=${limit}`)
  if (!response.ok) throw new Error(`HTTP error ${response.status}`)
  return response.json()
}

export async function getLogDetail(id: number): Promise<GenerationLogDetail> {
  const response = await fetch(`${API_URL}/logs/${id}`)
  if (!response.ok) throw new Error(`HTTP error ${response.status}`)
  return response.json()
}
