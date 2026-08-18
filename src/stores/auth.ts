import { create } from 'zustand'
import { api, clearToken, getToken, setToken } from '@/lib/api'
import type { User } from '@/types'

interface AuthResponse {
  user: { id: string; email: string; name: string }
  token: string
}

interface ProfileResponse {
  id: string
  email: string
  name: string
  created_at: string
}

interface AuthState {
  user: User | null
  loading: boolean
  // Tracks only the one-time session check on app load. Kept separate from
  // `loading` so a sign-in/sign-up request doesn't unmount the router tree
  // (see App.tsx, which gates its full-page spinner on this flag).
  initializing: boolean
  error: string | null
  signUp: (email: string, password: string, name: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initializeAuth: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initializing: true,
  error: null,

  signUp: async (email: string, password: string, name: string) => {
    set({ loading: true, error: null })
    try {
      const { user, token } = await api.post<AuthResponse>('/auth/signup', { email, password, name })
      setToken(token)
      set({ user: { ...user, createdAt: new Date().toISOString() } })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Sign up failed' })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null })
    try {
      const { user, token } = await api.post<AuthResponse>('/auth/signin', { email, password })
      setToken(token)
      set({ user: { ...user, createdAt: new Date().toISOString() } })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Sign in failed' })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    clearToken()
    set({ user: null })
  },

  initializeAuth: async () => {
    if (!getToken()) {
      set({ initializing: false })
      return
    }

    try {
      const profile = await api.get<ProfileResponse>('/auth/profile')
      set({ user: { id: profile.id, email: profile.email, name: profile.name, createdAt: profile.created_at } })
    } catch (error) {
      clearToken()
      console.error('Auth initialization failed:', error)
    } finally {
      set({ initializing: false })
    }
  },

  clearError: () => set({ error: null }),
}))
