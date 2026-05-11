// Natural Language Task Input Modal
// Main modal with text input, voice dictation, and confirmation flow

import { useState, useCallback, useEffect } from 'react'
import { X, Mic, MicOff, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useNLTask } from '../../api/hooks/useNLTask'
import { useVoiceInput } from '../smart-notepad/useVoiceInput'
import { TaskConfirmationForm } from './TaskConfirmationForm'
import { nlTasksApi } from '../../api/services/nl-tasks'
import type { ParsedTask } from './types'

type ModalStep = 'input' | 'confirm' | 'success' | 'error'

interface NLTaskInputModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskCreated?: (taskId: string) => void
}

export function NLTaskInputModal({ isOpen, onClose, onTaskCreated }: NLTaskInputModalProps) {
  const [step, setStep] = useState<ModalStep>('input')
  const [text, setText] = useState('')
  const [resultMessage, setResultMessage] = useState('')
  // Store original LLM output for learning system
  const [originalText, setOriginalText] = useState('')
  const [originalParsedTask, setOriginalParsedTask] = useState<ParsedTask | null>(null)

  const {
    parsedTask,
    parsing,
    parseError,
    creating,
    createError,
    createResult,
    parse,
    create,
    reset,
    updateParsedTask
  } = useNLTask()

  const {
    isListening,
    isSupported: voiceSupported,
    transcript,
    error: voiceError,
    toggleListening,
    clearTranscript
  } = useVoiceInput({
    language: 'es-ES',
    onResult: (result, isFinal) => {
      if (isFinal) {
        setText(prev => prev + (prev ? ' ' : '') + result)
      }
    }
  })

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('input')
        setText('')
        setResultMessage('')
        setOriginalText('')
        setOriginalParsedTask(null)
        reset()
        clearTranscript()
      }, 300)
    }
  }, [isOpen, reset, clearTranscript])

  // Handle parse
  const handleAnalyze = useCallback(async () => {
    if (!text.trim()) return

    const result = await parse(text)
    if (result) {
      // Store original LLM output for learning system
      setOriginalText(text)
      setOriginalParsedTask(JSON.parse(JSON.stringify(result))) // Deep copy
      setStep('confirm')
    }
  }, [text, parse])

  // Handle create task
  const handleSubmit = useCallback(async () => {
    if (!parsedTask) return

    const result = await create(parsedTask)
    if (result) {
      if (result.success) {
        // Save user corrections for learning system (if any modifications were made)
        if (originalText && originalParsedTask) {
          try {
            await nlTasksApi.saveCorrection(originalText, originalParsedTask, parsedTask)
          } catch (error) {
            // Log error but don't block the success flow
            console.error('Failed to save correction:', error)
          }
        }

        setResultMessage(result.message)
        setStep('success')
        if (onTaskCreated && result.task_id) {
          onTaskCreated(result.task_id)
        }
      } else {
        setResultMessage(result.message || 'Error al crear la tarea')
        setStep('error')
      }
    }
  }, [parsedTask, create, onTaskCreated, originalText, originalParsedTask])

  // Handle back to input
  const handleBack = useCallback(() => {
    setStep('input')
  }, [])

  // Handle close and reset
  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white border border-neutral-200 shadow-lg w-full max-w-lg max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-neutral-200">
          <h2 className="font-heading text-lg font-bold">
            {step === 'input' && 'Crear Tarea'}
            {step === 'confirm' && 'Confirmar Tarea'}
            {step === 'success' && 'Tarea Creada'}
            {step === 'error' && 'Error'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-neutral-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Step: Input */}
          {step === 'input' && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-500">
                Escribe o dicta tu tarea. Ejemplo: "Llamar a Juan sobre el pedido de Santiago para el viernes, prioridad alta"
              </p>

              {/* Text Area */}
              <div className="relative">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Escribe tu tarea aqui..."
                  rows={5}
                  className="w-full px-3 py-2 border-2 border-neutral-300 focus:border-neutral-900 outline-none resize-none"
                  disabled={parsing}
                />

                {/* Voice transcript indicator */}
                {isListening && transcript && (
                  <div className="absolute bottom-2 left-2 right-2 bg-gold-light border border-gold p-2 text-sm text-gold-dark">
                    {transcript}...
                  </div>
                )}
              </div>

              {/* Voice Error */}
              {voiceError && (
                <p className="text-sm text-error-dark">{voiceError}</p>
              )}

              {/* Parse Error */}
              {parseError && (
                <div className="p-3 bg-error-light border border-error text-error-text text-sm">
                  {parseError.message}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {/* Voice Button */}
                {voiceSupported && (
                  <button
                    onClick={toggleListening}
                    disabled={parsing}
                    className={`flex items-center gap-2 px-4 py-2 border-2 transition-all ${
                      isListening
                        ? 'bg-error border-error-dark text-white'
                        : 'border-neutral-300 hover:border-neutral-400'
                    } disabled:opacity-50`}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    {isListening ? 'Detener' : 'Dictar'}
                  </button>
                )}

                {/* Analyze Button */}
                <button
                  onClick={handleAnalyze}
                  disabled={!text.trim() || parsing}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-gold hover:bg-gold-dark text-neutral-900 font-medium uppercase tracking-wider border border-neutral-200 shadow-sm transition-all disabled:opacity-50"
                >
                  {parsing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      Analizar
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && parsedTask && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-500">
                Revisa y ajusta los campos extraídos antes de crear la tarea.
              </p>

              {/* Task Confirmation Form */}
              <TaskConfirmationForm
                parsedTask={parsedTask}
                onChange={updateParsedTask}
              />

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  disabled={creating}
                  className="px-6 py-2 border-2 border-neutral-300 hover:border-neutral-400 font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  Volver
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-gold hover:bg-gold-dark text-neutral-900 font-medium uppercase tracking-wider border border-neutral-200 shadow-sm transition-all disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      Crear Tarea
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="text-center py-6 space-y-4">
              <CheckCircle size={48} className="mx-auto text-success-dark" />
              <p className="text-lg font-medium">{resultMessage}</p>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-neutral-900 text-white font-medium uppercase tracking-wider hover:bg-neutral-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Step: Error */}
          {step === 'error' && (
            <div className="text-center py-6 space-y-4">
              <AlertCircle size={48} className="mx-auto text-error-dark" />
              <p className="text-lg font-medium text-error-text">{resultMessage}</p>
              {createError && (
                <p className="text-sm text-neutral-500">{createError.message}</p>
              )}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleBack}
                  className="px-6 py-2 border-2 border-neutral-300 hover:border-neutral-400 font-medium uppercase tracking-wider transition-colors"
                >
                  Volver
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-neutral-900 text-white font-medium uppercase tracking-wider hover:bg-neutral-800 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NLTaskInputModal
