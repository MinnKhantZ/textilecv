import { useRef, useState, useCallback } from 'react'
import { Files, CircleUserRound, Download, LoaderCircle } from 'lucide-react'
import { uploadFile, getSampleUrl, type UploadStatus } from '../api/client'

interface FileSlot {
  fileType: string
  label: string
  description: string
  accept: string
  icon: typeof Files
}

const FILE_SLOTS: FileSlot[] = [
  {
    fileType: 'experience',
    label: 'Master Experience',
    description: 'Detailed project & experience data (.md, .txt, .pdf, .docx)',
    accept: '.md,.txt,.pdf,.docx,text/markdown,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    icon: Files,
  },
  {
    fileType: 'about',
    label: 'About Me / Identity',
    description: 'Who you are, strengths, values, and life achievements (.md, .txt, .pdf, .docx)',
    accept: '.md,.txt,.pdf,.docx,text/markdown,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    icon: CircleUserRound,
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
        Upload your personal data files. They replace the active version immediately - no manual file placement needed.
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
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(slot.fileType)
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={onDrop(slot.fileType)}
              className={`relative cursor-pointer rounded-xl border-2 border-dashed p-5 transition-all duration-200
                ${isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}`}
              onClick={() => !isBusy && inputRefs.current[slot.fileType]?.click()}
            >
              <input
                type="file"
                accept={slot.accept}
                className="hidden"
                ref={(el) => {
                  inputRefs.current[slot.fileType] = el
                }}
                onChange={onInputChange(slot.fileType)}
              />

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <slot.icon className="h-6 w-6 shrink-0 text-slate-600" aria-hidden="true" strokeWidth={1.8} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{slot.label}</p>
                    <p className="text-xs text-slate-400">{slot.description}</p>
                  </div>
                </div>

                {isBusy ? (
                  <div className="flex items-center gap-2 text-xs text-indigo-600">
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" strokeWidth={2} />
                    Uploading...
                  </div>
                ) : status ? (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs">
                    <p className="truncate font-medium text-green-700">{status.original_filename}</p>
                    <p className="text-green-500">
                      {formatDate(status.uploaded_at)} · {formatBytes(status.file_size)}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400">No file uploaded yet. Click or drag to upload.</p>
                )}

                {error && <p className="text-xs text-red-500">{error}</p>}

                <a
                  href={getSampleUrl(slot.fileType)}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-indigo-500 transition-colors hover:text-indigo-700"
                >
                  <Download className="h-3 w-3" aria-hidden="true" strokeWidth={2.25} />
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
