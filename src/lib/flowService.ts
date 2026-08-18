import { api, ApiError } from '@/lib/api'
import type { FlowDefinition } from '@/types'

export class FlowService {
  /**
   * Load complete flow definition from database
   */
  static async loadFlowDefinition(flowId: string): Promise<FlowDefinition | null> {
    try {
      return await api.get<FlowDefinition>(`/flows/${flowId}/definition`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null
      }
      console.error('Failed to load flow definition:', error)
      throw error
    }
  }

  /**
   * Save complete flow definition to database
   */
  static async saveFlowDefinition(flowId: string, definition: FlowDefinition): Promise<void> {
    try {
      await api.post(`/flows/${flowId}/definition`, { definition })
    } catch (error) {
      console.error('Failed to save flow definition:', error)
      throw error
    }
  }

  /**
   * Validate flow structure
   */
  static validateFlow(definition: FlowDefinition): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Check if has start node
    const hasStart = definition.nodes.some((n) => n.type === 'start')
    if (!hasStart) {
      errors.push('Fluxo deve ter um nó de Início')
    }

    // Check if has end node
    const hasEnd = definition.nodes.some((n) => n.type === 'end')
    if (!hasEnd) {
      errors.push('Fluxo deve ter um nó de Fim')
    }

    // Check for orphaned nodes
    const connectedIds = new Set<string>()

    definition.edges.forEach((edge) => {
      connectedIds.add(edge.source)
      connectedIds.add(edge.target)
    })

    definition.nodes.forEach((node) => {
      // Start node can be unconnected (it's the entry point)
      if (node.type === 'start') return

      // End node can be unconnected (it's an exit point)
      if (node.type === 'end') return

      // Other nodes must be connected
      if (!connectedIds.has(node.id)) {
        errors.push(`Nó "${node.data.label}" não está conectado a nenhum outro nó`)
      }
    })

    // Validate node configurations
    definition.nodes.forEach((node) => {
      if (node.type === 'question' && !node.data.config?.variable) {
        errors.push(`Pergunta "${node.data.label}" não tem variável definida`)
      }

      if (node.type === 'http' && !node.data.config?.url) {
        errors.push(`Request HTTP "${node.data.label}" não tem URL definida`)
      }

      if (node.type === 'condition' && !node.data.config?.rule) {
        errors.push(`Condição "${node.data.label}" não tem regra definida`)
      }

      if (node.type === 'webhook' && !node.data.config?.variable) {
        errors.push(`Webhook "${node.data.label}" não tem variável definida`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Get flow validation errors
   */
  static getValidationErrors(definition: FlowDefinition): string[] {
    const validation = this.validateFlow(definition)
    return validation.errors
  }

  /**
   * Get flow version history
   */
  static async getVersions(flowId: string): Promise<any[]> {
    try {
      return await api.get<any[]>(`/flows/${flowId}/versions`)
    } catch (error) {
      console.error('Failed to get versions:', error)
      throw error
    }
  }

  /**
   * Restore a previous version as the current definition
   */
  static async restoreVersion(flowId: string, version: number): Promise<void> {
    try {
      const versions = await this.getVersions(flowId)
      const target = versions.find((v) => v.version === version)
      if (!target) throw new Error('Version not found')

      await this.saveFlowDefinition(flowId, target.snapshot as FlowDefinition)
    } catch (error) {
      console.error('Failed to restore version:', error)
      throw error
    }
  }

  /**
   * Publish flow (creates immutable version server-side)
   */
  static async publishFlow(flowId: string, _userId: string, definition: FlowDefinition): Promise<number> {
    try {
      const validation = this.validateFlow(definition)
      if (!validation.valid) {
        throw new Error(`Fluxo não pode ser publicado: ${validation.errors.join(', ')}`)
      }

      // Ensure the server has the latest definition before publishing it
      await this.saveFlowDefinition(flowId, definition)

      const result = await api.post<{ version: number }>(`/flows/${flowId}/publish`)
      return result.version
    } catch (error) {
      console.error('Failed to publish flow:', error)
      throw error
    }
  }

  /**
   * Duplicate a flow
   */
  static async duplicateFlow(flowId: string, workspaceId: string, newName: string): Promise<string> {
    try {
      const definition = await this.loadFlowDefinition(flowId)
      if (!definition) {
        throw new Error('Flow not found')
      }

      const newFlow = await api.post<{ id: string }>('/flows', { workspaceId, name: newName })

      await this.saveFlowDefinition(newFlow.id, {
        ...definition,
        id: newFlow.id,
        name: newName,
      })

      return newFlow.id
    } catch (error) {
      console.error('Failed to duplicate flow:', error)
      throw error
    }
  }

  /**
   * Delete a flow
   */
  static async deleteFlow(flowId: string): Promise<void> {
    try {
      await api.delete(`/flows/${flowId}`)
    } catch (error) {
      console.error('Failed to delete flow:', error)
      throw error
    }
  }
}
