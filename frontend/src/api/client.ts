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
  output_text: string | null
  artifact_path: string | null
  compatible: number
  generated_at: string
  preferences: string | null
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

