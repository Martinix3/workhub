// Voice Input Hook using Web Speech API
// Browser-native speech recognition (free, works offline in Chrome)

import { useState, useCallback, useRef, useEffect } from 'react'

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition
}

// Get the SpeechRecognition constructor
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null

  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }

  return win.SpeechRecognition || win.webkitSpeechRecognition || null
}

export interface UseVoiceInputOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
}

export interface UseVoiceInputReturn {
  isListening: boolean
  isSupported: boolean
  transcript: string
  error: string | null
  startListening: () => void
  stopListening: () => void
  toggleListening: () => void
  clearTranscript: () => void
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    language = 'es-ES',
    continuous = true,
    interimResults = true,
    onResult,
    onError
  } = options

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const SpeechRecognitionClass = getSpeechRecognition()
  const isSupported = !!SpeechRecognitionClass

  // Initialize recognition
  useEffect(() => {
    if (!SpeechRecognitionClass) return

    const recognition = new SpeechRecognitionClass()
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.lang = language

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      const currentTranscript = finalTranscript || interimTranscript
      setTranscript(prev => {
        const newTranscript = finalTranscript ? prev + finalTranscript : prev
        return newTranscript || currentTranscript
      })

      if (onResult) {
        onResult(currentTranscript, !!finalTranscript)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessages: Record<string, string> = {
        'no-speech': 'No se detecto voz. Intenta de nuevo.',
        'audio-capture': 'No se encontro microfono.',
        'not-allowed': 'Permiso de microfono denegado.',
        'network': 'Error de red.',
        'aborted': 'Reconocimiento cancelado.'
      }

      const message = errorMessages[event.error] || `Error: ${event.error}`
      setError(message)
      setIsListening(false)

      if (onError) {
        onError(message)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [SpeechRecognitionClass, language, continuous, interimResults, onResult, onError])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('El reconocimiento de voz no esta disponible en este navegador.')
      return
    }

    setError(null)
    setTranscript('')

    try {
      recognitionRef.current.start()
    } catch (err) {
      // May throw if already started
      console.warn('Speech recognition start error:', err)
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  const clearTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  return {
    isListening,
    isSupported,
    transcript,
    error,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript
  }
}

export default useVoiceInput
