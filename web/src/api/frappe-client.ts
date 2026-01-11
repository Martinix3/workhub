// Frappe API Client for WorkHub
// Handles authentication, API calls, and error handling

export interface FrappeConfig {
  baseUrl: string
  onAuthError?: () => void
}

export interface FrappeResponse<T> {
  message: T
}

export interface FrappeError {
  exc_type?: string
  exc?: string
  _server_messages?: string
}

class FrappeClient {
  private baseUrl: string
  private onAuthError?: () => void

  constructor(config: FrappeConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.onAuthError = config.onAuthError
  }

  // Build headers for API calls
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  }

  // Generic API call method
  async call<T>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}/api/method/${method}`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        credentials: 'include',
        body: params ? JSON.stringify(params) : undefined,
      })

      if (response.status === 401 || response.status === 403) {
        this.onAuthError?.()
        throw new Error('Authentication required')
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          (errorData as FrappeError)._server_messages ||
          (errorData as FrappeError).exc ||
          `API Error: ${response.status}`
        )
      }

      const data: FrappeResponse<T> = await response.json()
      return data.message
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Network error')
    }
  }

  // GET request for fetching resources
  async get<T>(
    doctype: string,
    name?: string,
    filters?: Record<string, unknown>,
    fields?: string[],
    limit?: number
  ): Promise<T> {
    let url = `${this.baseUrl}/api/resource/${doctype}`

    if (name) {
      url += `/${encodeURIComponent(name)}`
    }

    const params = new URLSearchParams()
    if (filters) {
      params.append('filters', JSON.stringify(filters))
    }
    if (fields) {
      params.append('fields', JSON.stringify(fields))
    }
    if (limit) {
      params.append('limit_page_length', limit.toString())
    }

    const queryString = params.toString()
    if (queryString) {
      url += `?${queryString}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include',
    })

    if (response.status === 401 || response.status === 403) {
      this.onAuthError?.()
      throw new Error('Authentication required')
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const data = await response.json()
    return data.data
  }

  // POST request for creating resources
  async create<T>(
    doctype: string,
    data: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}/api/resource/${doctype}`

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    })

    if (response.status === 401 || response.status === 403) {
      this.onAuthError?.()
      throw new Error('Authentication required')
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        (errorData as FrappeError)._server_messages ||
        `Create Error: ${response.status}`
      )
    }

    const result = await response.json()
    return result.data
  }

  // PUT request for updating resources
  async update<T>(
    doctype: string,
    name: string,
    data: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}/api/resource/${doctype}/${encodeURIComponent(name)}`

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    })

    if (response.status === 401 || response.status === 403) {
      this.onAuthError?.()
      throw new Error('Authentication required')
    }

    if (!response.ok) {
      throw new Error(`Update Error: ${response.status}`)
    }

    const result = await response.json()
    return result.data
  }

  // DELETE request
  async delete(doctype: string, name: string): Promise<void> {
    const url = `${this.baseUrl}/api/resource/${doctype}/${encodeURIComponent(name)}`

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include',
    })

    if (response.status === 401 || response.status === 403) {
      this.onAuthError?.()
      throw new Error('Authentication required')
    }

    if (!response.ok) {
      throw new Error(`Delete Error: ${response.status}`)
    }
  }

  // Get current logged in user (uses WorkHub's whitelisted endpoint)
  async getLoggedUser(): Promise<string | null> {
    try {
      const response = await this.call<string>('workhub_frappe_app.api.auth.get_logged_user')
      return response
    } catch {
      return null
    }
  }

  // Get user info (uses WorkHub's whitelisted endpoint)
  async getUserInfo(): Promise<{
    user: string
    full_name: string
    email: string | null
    user_image: string | null
    roles: string[]
  } | null> {
    try {
      return await this.call('workhub_frappe_app.api.auth.get_user_info')
    } catch {
      return null
    }
  }

  // Verify auth cookie and get user info (uses WorkHub's whitelisted endpoint)
  async verifyAuthCookie(): Promise<{
    authenticated: boolean
    user: string
    full_name?: string
    email?: string
    user_image?: string
    roles?: string[]
    error?: string
  }> {
    try {
      return await this.call('workhub_frappe_app.api.auth.verify_auth_cookie')
    } catch (error) {
      return {
        authenticated: false,
        user: 'Guest',
        error: error instanceof Error ? error.message : 'Verification failed'
      }
    }
  }

  // Login with username and password (for testing)
  async login(usr: string, pwd: string): Promise<boolean> {
    const url = `${this.baseUrl}/api/method/login`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ usr, pwd }),
    })

    return response.ok
  }

  // Logout
  async logout(): Promise<void> {
    await this.call('logout')
  }
}

// In development with proxy, use empty baseUrl (relative paths)
// In production or without proxy, use the full FRAPPE_URL
const getBaseUrl = () => {
  // During development, Vite proxy handles /api/* requests
  // Use empty string to make requests relative (go through proxy)
  if (import.meta.env.DEV) {
    return ''
  }
  return import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8000'
}

// Export singleton instance
export const frappe = new FrappeClient({
  baseUrl: getBaseUrl(),
  // NOTE: Don't auto-redirect on auth errors - let the AuthContext handle it
  // This prevents redirect loops when navigating between pages
})

export default frappe
