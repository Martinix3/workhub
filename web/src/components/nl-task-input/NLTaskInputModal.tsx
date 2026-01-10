// Natural Language Task Input Modal
// Main modal with text input, voice dictation, and confirmation flow

import { useState, useCallback, useEffect } from 'react'
import { X, Mic, MicOff, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useNLTask } from '../../api/hooks/useNLTask'
import { useVoiceInput } from '../smart-notepad/useVoiceInput'
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
      setStep('confirm')
    }
  }, [text, parse])

  // Handle create task
  const handleSubmit = useCallback(async () => {
    if (!parsedTask) return

    const result = await create(parsedTask)
    if (result) {
      if (result.success) {
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
  }, [parsedTask, create, onTaskCreated])

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
      <div className="relative bg-white border-2 border-stone-900 shadow-[8px_8px_0_#1c1917] w-full max-w-lg max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-stone-200">
          <h2 className="font-serif text-lg font-bold">
            {step === 'input' && 'Crear Tarea'}
            {step === 'confirm' && 'Confirmar Tarea'}
            {step === 'success' && 'Tarea Creada'}
            {step === 'error' && 'Error'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-stone-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Step: Input */}
          {step === 'input' && (
            <div className="space-y-4">
              <p className="text-sm text-stone-500">
                Escribe o dicta tu tarea. Ejemplo: "Llamar a Juan sobre el pedido de Santiago para el viernes, prioridad alta"
              </p>

              {/* Text Area */}
              <div className="relative">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Escribe tu tarea aqui..."
                  rows={5}
                  className="w-full px-3 py-2 border-2 border-stone-300 focus:border-stone-900 outline-none resize-none"
                  disabled={parsing}
                />

                {/* Voice transcript indicator */}
                {isListening && transcript && (
                  <div className="absolute bottom-2 left-2 right-2 bg-amber-50 border border-amber-200 p-2 text-sm text-amber-700">
                    {transcript}...
                  </div>
                )}
              </div>

              {/* Voice Error */}
              {voiceError && (
                <p className="text-sm text-red-600">{voiceError}</p>
              )}

              {/* Parse Error */}
              {parseError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
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
                        ? 'bg-red-500 border-red-600 text-white'
                        : 'border-stone-300 hover:border-stone-400'
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
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-medium uppercase tracking-wider border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] hover:shadow-[2px_2px_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:hover:shadow-[4px_4px_0_#1c1917] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
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
              <p className="text-sm text-stone-500">
                Revisa y ajusta los campos extraídos antes de crear la tarea.
              </p>

              {/* Placeholder for TaskConfirmationForm - will be implemented in subtask 4.2 */}
              <div className="p-4 border-2 border-stone-200 bg-stone-50">
                <p className="text-sm text-stone-600 mb-2">
                  <strong>Título:</strong> {parsedTask.title}
                </p>
                {parsedTask.due_date && (
                  <p className="text-sm text-stone-600 mb-2">
                    <strong>Fecha límite:</strong> {parsedTask.due_date}
                  </p>
                )}
                <p className="text-sm text-stone-600 mb-2">
                  <strong>Prioridad:</strong> {parsedTask.priority}
                </p>
                {parsedTask.assignee.matched && parsedTask.assignee.user && (
                  <p className="text-sm text-stone-600 mb-2">
                    <strong>Asignado a:</strong> {parsedTask.assignee.user.full_name}
                  </p>
                )}
                {parsedTask.project.matched && parsedTask.project.project && (
                  <p className="text-sm text-stone-600 mb-2">
                    <strong>Proyecto:</strong> {parsedTask.project.project.title}
                  </p>
                )}
                {parsedTask.description && (
                  <p className="text-sm text-stone-600">
                    <strong>Descripción:</strong> {parsedTask.description}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  disabled={creating}
                  className="px-6 py-2 border-2 border-stone-300 hover:border-stone-400 font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  Volver
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-medium uppercase tracking-wider border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] hover:shadow-[2px_2px_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:hover:shadow-[4px_4px_0_#1c1917] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
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
              <CheckCircle size={48} className="mx-auto text-green-600" />
              <p className="text-lg font-medium">{resultMessage}</p>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-stone-900 text-white font-medium uppercase tracking-wider hover:bg-stone-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Step: Error */}
          {step === 'error' && (
            <div className="text-center py-6 space-y-4">
              <AlertCircle size={48} className="mx-auto text-red-600" />
              <p className="text-lg font-medium text-red-700">{resultMessage}</p>
              {createError && (
                <p className="text-sm text-stone-500">{createError.message}</p>
              )}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleBack}
                  className="px-6 py-2 border-2 border-stone-300 hover:border-stone-400 font-medium uppercase tracking-wider transition-colors"
                >
                  Volver
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-stone-900 text-white font-medium uppercase tracking-wider hover:bg-stone-800 transition-colors"
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
