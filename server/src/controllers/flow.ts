import { Request, Response } from 'express'
import { query } from '../db/connection.js'
import { v4 as uuidv4 } from 'uuid'

// Verificar acesso ao workspace
async function checkWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
  const result = await query(
    `SELECT w.id FROM workspaces w
     WHERE w.id = $1
     AND (w.owner_id = $2 OR EXISTS (
       SELECT 1 FROM workspace_members wm
       WHERE wm.workspace_id = w.id AND wm.user_id = $2
     ))`,
    [workspaceId, userId]
  )
  return result.rows.length > 0
}

export async function getFlows(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { workspaceId } = req.query

    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' })
    }

    // Verificar acesso
    const hasAccess = await checkWorkspaceAccess(req.user.userId, workspaceId as string)
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const result = await query('SELECT * FROM flows WHERE workspace_id = $1 ORDER BY updated_at DESC', [workspaceId])

    res.json(result.rows)
  } catch (error) {
    console.error('Get flows error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function createFlow(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { workspaceId, name, description } = req.body

    if (!workspaceId || !name) {
      return res.status(400).json({ error: 'workspaceId and name are required' })
    }

    // Verificar acesso
    const hasAccess = await checkWorkspaceAccess(req.user.userId, workspaceId)
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const flowId = uuidv4()

    // Criar flow
    const result = await query(
      'INSERT INTO flows (id, workspace_id, name, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [flowId, workspaceId, name, description || null]
    )

    const flow = result.rows[0]

    // Criar definição vazia
    await query(
      'INSERT INTO flow_definitions (flow_id, definition) VALUES ($1, $2)',
      [
        flow.id,
        JSON.stringify({
          id: flow.id,
          name,
          nodes: [],
          edges: [],
          variables: [],
        }),
      ]
    )

    res.status(201).json(flow)
  } catch (error) {
    console.error('Create flow error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getFlow(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { id } = req.params

    // Buscar flow e verificar acesso
    const result = await query(
      `SELECT f.* FROM flows f
       JOIN workspaces w ON f.workspace_id = w.id
       WHERE f.id = $1
       AND (w.owner_id = $2 OR EXISTS (
         SELECT 1 FROM workspace_members wm
         WHERE wm.workspace_id = w.id AND wm.user_id = $2
       ))`,
      [id, req.user.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Flow not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Get flow error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function updateFlow(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { id } = req.params
    const { name, description, status } = req.body

    // Verificar acesso
    const flowCheck = await query(
      `SELECT f.workspace_id FROM flows f
       JOIN workspaces w ON f.workspace_id = w.id
       WHERE f.id = $1
       AND (w.owner_id = $2 OR EXISTS (
         SELECT 1 FROM workspace_members wm
         WHERE wm.workspace_id = w.id AND wm.user_id = $2
       ))`,
      [id, req.user.userId]
    )

    if (flowCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const result = await query(
      'UPDATE flows SET name = COALESCE($1, name), description = COALESCE($2, description), status = COALESCE($3, status), updated_at = NOW() WHERE id = $4 RETURNING *',
      [name || null, description || null, status || null, id]
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('Update flow error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function deleteFlow(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { id } = req.params

    // Verificar acesso
    const flowCheck = await query(
      `SELECT f.workspace_id FROM flows f
       JOIN workspaces w ON f.workspace_id = w.id
       WHERE f.id = $1
       AND (w.owner_id = $2 OR EXISTS (
         SELECT 1 FROM workspace_members wm
         WHERE wm.workspace_id = w.id AND wm.user_id = $2
       ))`,
      [id, req.user.userId]
    )

    if (flowCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' })
    }

    await query('DELETE FROM flows WHERE id = $1', [id])

    res.status(204).send()
  } catch (error) {
    console.error('Delete flow error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
