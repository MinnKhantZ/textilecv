import { useRef, useState, useCallback } from 'react'
import { uploadFile, getSampleUrl, type UploadStatus } from '../api/client'

interface FileSlot {
  fileType: string
  label: string
  description: string
  accept: string
  icon: string
}

const FILE_SLOTS: FileSlot[] = [
  {
    fileType: 'experience',
    label: 'Master Experience',
    description: 'Detailed project & experience data (.md, .txt, .pdf, .docx)',
    accept: '.md,.txt,.pdf,.docx,text/markdown,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    icon: '🗂️',
  },
  {
    fileType: 'about',
    label: 'About Me / Identity',
    description: 'Who you are, strengths, values, and life achievements (.md, .txt, .pdf, .docx)',
    accept: '.md,.txt,.pdf,.docx,text/markdown,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    icon: '🙋',
  },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

interface Props {
  uploadStatus: Record<string, UploadStatus>
  onUploadComplete: () => void
}

export default function FileUploader({ uploadStatus, onUploadComplete }: Props) {
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dragOver, setDragOver] = useState<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleUpload = useCallback(
    async (fileType: string, file: File) => {
      setErrors((prev) => ({ ...prev, [fileType]: '' }))
      setUploading((prev) => ({ ...prev, [fileType]: true }))
      try {
        await uploadFile(fileType, file)
        onUploadComplete()
      } catch (err) {
        setErrors((prev) => ({
          ...prev,
          [fileType]: err instanceof Error ? err.message : 'Upload failed',
        }))
      } finally {
        setUploading((prev) => ({ ...prev, [fileType]: false }))
      }
    },
    [onUploadComplete]
  )

  const onInputChange = (fileType: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleUpload(fileType, file)
    e.target.value = ''
  }

  const onDrop = (fileType: string) => (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(null)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleUpload(fileType, file)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Your Data Files</h2>
      <p className="text-sm text-slate-500">
        Upload your personal data files. They replace the active version immediately — no manual
        file placement needed.
      </p>

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
        {FILE_SLOTS.map((slot) => {
          const status = uploadStatus[slot.fileType]
          const isBusy = uploading[slot.fileType]
          const error = errors[slot.fileType]
          const isDragging = dragOver === slot.fileType

          return (
            <div
              key={slot.fileType}
              onDragOver={(e) => { e.preventDefault(); setDragOver(slot.fileType) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={onDrop(slot.fileType)}
              className={`relative rounded-xl border-2 border-dashed p-5 transition-all duration-200 cursor-pointer
                ${isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}`}
              onClick={() => !isBusy && inputRefs.current[slot.fileType]?.click()}
            >
              <input
                type="file"
                accept={slot.accept}
                className="hidden"
                ref={(el) => { inputRefs.current[slot.fileType] = el }}
                onChange={onInputChange(slot.fileType)}
              />

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{slot.icon}</span>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{slot.label}</p>
                    <p className="text-xs text-slate-400">{slot.description}</p>
                  </div>
                </div>

                {isBusy ? (
                  <div className="flex items-center gap-2 text-indigo-600 text-xs">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Uploading…
                  </div>
                ) : status ? (
                  <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs">
                    <p className="font-medium text-green-700 truncate">{status.original_filename}</p>
                    <p className="text-green-500">{formatDate(status.uploaded_at)} · {formatBytes(status.file_size)}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No file uploaded yet. Click or drag to upload.</p>
                )}

                {error && <p className="text-xs text-red-500">{error}</p>}

                {/* Download sample link — stops propagation so it doesn't open the file picker */}
                <a
                  href={getSampleUrl(slot.fileType)}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download sample
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
