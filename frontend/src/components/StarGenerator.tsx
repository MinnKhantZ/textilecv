import { useState } from 'react'
import OutputPanel from './OutputPanel'
import { generateStarAnswers } from '../api/client'

export default function StarGenerator() {
  const [questions, setQuestions] = useState<string[]>([''])
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const addQuestion = () => {
    if (questions.length < 10) {
      setQuestions((prev) => [...prev, ''])
    }
  }

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const updateQuestion = (index: number, value: string) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? value : q)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validQuestions = questions.filter((q) => q.trim())
    if (validQuestions.length === 0) return

    setIsLoading(true)
    setError('')
    setOutput('')

    try {
      const data = await generateStarAnswers(validQuestions)
      setOutput(data.result)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate STAR answers. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const validCount = questions.filter((q) => q.trim()).length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <svg
              className="w-4 h-4 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Behavioral Questions</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4 ml-10">
          Add up to 10 questions — the AI uses a different project story for each answer
        </p>

        <form onSubmit={handleSubmit}>
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-1">
            {questions.map((question, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mt-2.5">
                  <span className="text-xs font-semibold text-amber-700">{index + 1}</span>
                </div>
                <textarea
                  value={question}
                  onChange={(e) => updateQuestion(index, e.target.value)}
                  placeholder={`e.g., "Tell me about a time you faced a difficult technical challenge…"`}
                  className="flex-1 p-3 border border-slate-200 rounded-lg text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder:text-slate-300"
                  rows={2}
                  maxLength={1000}
                />
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="flex-shrink-0 mt-2.5 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200"
                    title="Remove question"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={addQuestion}
              disabled={questions.length >= 10}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Question
            </button>

            <button
              type="submit"
              disabled={isLoading || validCount === 0}
              className="px-6 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generating…
                </>
              ) : (
                `Generate ${validCount} STAR Answer${validCount !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </form>
      </div>

      <OutputPanel
        content={output}
        isLoading={isLoading}
        error={error}
        title="STAR Answers"
        emptyMessage="Your STAR-method answers will appear here"
      />
    </div>
  )
}
