import { create } from 'zustand'
import { api } from '@/lib/api'
import type { Workspace } from '@/types'

interface WorkspaceRow {
  id: string
  name: string
  owner_id: string
  created_at: string
}

interface WorkspaceState {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  loading: boolean
  error: string | null
  fetchWorkspaces: () => Promise<void>
  createWorkspace: (name: string) => Promise<Workspace>
  setCurrentWorkspace: (workspace: Workspace) => void
  clearError: () => void
}

function mapWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  }
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  currentWorkspace: null,
  loading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ loading: true, error: null })
    try {
      const rows = await api.get<WorkspaceRow[]>('/workspaces')
      set({ workspaces: rows.map(mapWorkspace) })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch workspaces' })
    } finally {
      set({ loading: false })
    }
  },

  createWorkspace: async (name: string) => {
    set({ loading: true, error: null })
    try {
      const row = await api.post<WorkspaceRow>('/workspaces', { name })
      const workspace = mapWorkspace(row)

      set((state) => ({
        workspaces: [...state.workspaces, workspace],
      }))

      return workspace
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create workspace'
      set({ error: message })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  setCurrentWorkspace: (workspace: Workspace) => {
    set({ currentWorkspace: workspace })
  },

  clearError: () => set({ error: null }),
}))
