import { Request, Response } from 'express'
import { query } from '../db/connection'
import { v4 as uuidv4 } from 'uuid'

export async function getWorkspaces(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const result = await query(
      `SELECT w.* FROM workspaces w
       WHERE w.owner_id = $1
       OR EXISTS (
         SELECT 1 FROM workspace_members wm
         WHERE wm.workspace_id = w.id AND wm.user_id = $1
       )`,
      [req.user.userId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Get workspaces error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function createWorkspace(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { name } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Workspace name is required' })
    }

    const workspaceId = uuidv4()
    const result = await query(
      'INSERT INTO workspaces (id, owner_id, name) VALUES ($1, $2, $3) RETURNING *',
      [workspaceId, req.user.userId, name]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create workspace error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getWorkspace(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { id } = req.params

    // Verificar se tem acesso
    const accessCheck = await query(
      `SELECT w.id FROM workspaces w
       WHERE w.id = $1
       AND (w.owner_id = $2 OR EXISTS (
         SELECT 1 FROM workspace_members wm
         WHERE wm.workspace_id = w.id AND wm.user_id = $2
       ))`,
      [id, req.user.userId]
    )

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const result = await query('SELECT * FROM workspaces WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Get workspace error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
