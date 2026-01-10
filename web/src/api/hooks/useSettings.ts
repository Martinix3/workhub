// React hooks for Settings
import { useState, useEffect, useCallback } from 'react'
import settingsApi from '../services/settings'
import type { UserSettings, UserProfile, Department, UpdateSettingsData, UpdateProfileData } from '../services/settings'
import { createDataHook } from './createDataHook'
import { sampleDepartments } from '../sample-data'

interface UseDataState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// Hook for user settings
export function useUserSettings(): UseDataState<UserSettings> & {
  updateSettings: (data: UpdateSettingsData) => Promise<void>
  updating: boolean
} {
  const [data, setData] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const settings = await settingsApi.getSettings()
      setData(settings)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch settings'))
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSettings = useCallback(async (updateData: UpdateSettingsData) => {
    setUpdating(true)
    setError(null)
    try {
      const updated = await settingsApi.updateSettings(updateData)
      setData(updated)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update settings'))
      throw err
    } finally {
      setUpdating(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch, updateSettings, updating }
}

// Hook for user profile
export function useUserProfile(): UseDataState<UserProfile> & {
  updateProfile: (data: UpdateProfileData) => Promise<void>
  updating: boolean
} {
  const [data, setData] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const profile = await settingsApi.getProfile()
      setData(profile)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch profile'))
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (updateData: UpdateProfileData) => {
    setUpdating(true)
    setError(null)
    try {
      const updated = await settingsApi.updateProfile(updateData)
      setData(updated)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update profile'))
      throw err
    } finally {
      setUpdating(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch, updateProfile, updating }
}

// Hook for departments
export const useDepartments = createDataHook<Department[]>({
  apiMethod: settingsApi.getDepartments,
  sampleData: sampleDepartments,
  errorMessage: 'Failed to fetch departments'
})
