// React hooks for Admin
import { useState, useEffect, useCallback } from 'react'
import adminApi from '../services/admin'
import type {
  User,
  UserDetail,
  UsersResponse,
  Role,
  CreateUserData,
  UpdateUserData
} from '../services/admin'
import { createDataHook, type UseDataState } from './createDataHook'
// sampleRoles removed - does not exist in sample-data

// Hook for users list with pagination and search
export function useUsers(initialLimit = 50): UseDataState<UsersResponse> & {
  search: string
  setSearch: (search: string) => void
  page: number
  setPage: (page: number) => void
  limit: number
} {
  const [data, setData] = useState<UsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [limit] = useState(initialLimit)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const offset = page * limit
      const result = await adminApi.getUsers(limit, offset, search || undefined)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch users'))
    } finally {
      setLoading(false)
    }
  }, [search, page, limit])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch, search, setSearch, page, setPage, limit }
}

// Hook for single user detail
export function useUserDetail(userId: string | null): UseDataState<UserDetail> {
  const [data, setData] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(!!userId)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    if (!userId) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const user = await adminApi.getUserDetail(userId)
      setData(user)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user'))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// Hook for roles list
export const useRoles = createDataHook<Role[]>({
  apiMethod: adminApi.getRoles,
  sampleData: [] as Role[],
  errorMessage: 'Failed to fetch roles'
})

// Hook for user CRUD operations
export function useUserMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createUser = useCallback(async (data: CreateUserData): Promise<UserDetail> => {
    setLoading(true)
    setError(null)
    try {
      const user = await adminApi.createUser(data)
      return user
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create user')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const updateUser = useCallback(async (userId: string, data: UpdateUserData): Promise<UserDetail> => {
    setLoading(true)
    setError(null)
    try {
      const user = await adminApi.updateUser(userId, data)
      return user
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update user')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteUser = useCallback(async (userId: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      await adminApi.deleteUser(userId)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete user')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const assignRole = useCallback(async (userId: string, role: string): Promise<string[]> => {
    setLoading(true)
    setError(null)
    try {
      const result = await adminApi.assignRole(userId, role)
      return result.roles
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to assign role')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const removeRole = useCallback(async (userId: string, role: string): Promise<string[]> => {
    setLoading(true)
    setError(null)
    try {
      const result = await adminApi.removeRole(userId, role)
      return result.roles
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to remove role')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const sendInvitation = useCallback(async (email: string, firstName?: string, roles?: string[]): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      await adminApi.sendInvitation(email, firstName, roles)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send invitation')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    assignRole,
    removeRole,
    sendInvitation
  }
}
