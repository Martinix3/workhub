// React hooks for Smart Notepad
import { useState, useCallback } from 'react'
import notepadApi from '../services/notepad'
import type {
  ParsedNote,
  ExecuteResult,
  CustomerSuggestion,
  ItemOption
} from '../../components/smart-notepad/types'

interface UseNotepadState {
  parsedNote: ParsedNote | null
  parsing: boolean
  parseError: Error | null
  executing: boolean
  executeError: Error | null
  executeResult: ExecuteResult | null
}

export function useNotepad() {
  const [state, setState] = useState<UseNotepadState>({
    parsedNote: null,
    parsing: false,
    parseError: null,
    executing: false,
    executeError: null,
    executeResult: null
  })

  const parse = useCallback(async (text: string): Promise<ParsedNote | null> => {
    setState(prev => ({
      ...prev,
      parsing: true,
      parseError: null,
      parsedNote: null
    }))

    try {
      const result = await notepadApi.parse(text)
      setState(prev => ({
        ...prev,
        parsing: false,
        parsedNote: result
      }))
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to parse note')
      setState(prev => ({
        ...prev,
        parsing: false,
        parseError: error
      }))
      return null
    }
  }, [])

  const execute = useCallback(async (parsedNote: ParsedNote): Promise<ExecuteResult | null> => {
    setState(prev => ({
      ...prev,
      executing: true,
      executeError: null,
      executeResult: null
    }))

    try {
      const result = await notepadApi.execute(parsedNote)
      setState(prev => ({
        ...prev,
        executing: false,
        executeResult: result
      }))
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to execute actions')
      setState(prev => ({
        ...prev,
        executing: false,
        executeError: error
      }))
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setState({
      parsedNote: null,
      parsing: false,
      parseError: null,
      executing: false,
      executeError: null,
      executeResult: null
    })
  }, [])

  const updateParsedNote = useCallback((updates: Partial<ParsedNote>) => {
    setState(prev => ({
      ...prev,
      parsedNote: prev.parsedNote ? { ...prev.parsedNote, ...updates } : null
    }))
  }, [])

  return {
    ...state,
    parse,
    execute,
    reset,
    updateParsedNote
  }
}

export function useCustomerSearch() {
  const [customers, setCustomers] = useState<CustomerSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setCustomers([])
      return
    }

    setLoading(true)
    try {
      const results = await notepadApi.searchCustomers(query)
      setCustomers(results)
    } catch (err) {
      console.error('Customer search error:', err)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { customers, loading, search }
}

export function useItemSearch() {
  const [items, setItems] = useState<ItemOption[]>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setItems([])
      return
    }

    setLoading(true)
    try {
      const results = await notepadApi.searchItems(query)
      setItems(results)
    } catch (err) {
      console.error('Item search error:', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { items, loading, search }
}

export default useNotepad
