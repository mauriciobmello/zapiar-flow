import { Request, Response } from 'express'
import { query } from '../db/connection.js'

export async function getFlowDefinition(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { flowId } = req.params

    // Verificar acesso
    const accessCheck = await query(
      `SELECT fd.* FROM flow_definitions fd
       JOIN flows f ON fd.flow_id = f.id
       JOIN workspaces w ON f.workspace_id = w.id
       WHERE fd.flow_id = $1
       AND (w.owner_id = $2 OR EXISTS (
         SELECT 1 FROM workspace_members wm
         WHERE wm.workspace_id = w.id AND wm.user_id = $2
       ))`,
      [flowId, req.user.userId]
    )

    if (accessCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Flow definition not found' })
    }

    res.json(accessCheck.rows[0].definition)
  } catch (error) {
    console.error('Get flow definition error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function saveFlowDefinition(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { flowId } = req.params
    const { definition } = req.body

    if (!definition) {
      return res.status(400).json({ error: 'Definition is required' })
    }

    // Verificar acesso
    const accessCheck = await query(
      `SELECT f.id FROM flows f
       JOIN workspaces w ON f.workspace_id = w.id
       WHERE f.id = $1
       AND (w.owner_id = $2 OR EXISTS (
         SELECT 1 FROM workspace_members wm
         WHERE wm.workspace_id = w.id AND wm.user_id = $2
       ))`,
      [flowId, req.user.userId]
    )

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // UPSERT definition
    const result = await query(
      `INSERT INTO flow_definitions (flow_id, definition)
       VALUES ($1, $2)
       ON CONFLICT (flow_id) DO UPDATE SET
       definition = $2,
       updated_at = NOW()
       RETURNING *`,
      [flowId, JSON.stringify(definition)]
    )

    // Update flow updated_at
    await query('UPDATE flows SET updated_at = NOW() WHERE id = $1', [flowId])

    res.json(result.rows[0])
  } catch (error) {
    console.error('Save flow definition error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function publishFlow(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { flowId } = req.params

    // Verificar acesso
    const flowCheck = await query(
      `SELECT f.* FROM flows f
       JOIN workspaces w ON f.workspace_id = w.id
       WHERE f.id = $1
       AND (w.owner_id = $2 OR EXISTS (
         SELECT 1 FROM workspace_members wm
         WHERE wm.workspace_id = w.id AND wm.user_id = $2
       ))`,
      [flowId, req.user.userId]
    )

    if (flowCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const flow = flowCheck.rows[0]

    // Buscar definição atual
    const defResult = await query('SELECT definition FROM flow_definitions WHERE flow_id = $1', [flowId])

    if (defResult.rows.length === 0) {
      return res.status(404).json({ error: 'Flow definition not found' })
    }

    const definition = defResult.rows[0].definition

    // Criar versão imutável
    const nextVersion = flow.version + 1

    await query(
      `INSERT INTO flow_versions (flow_id, version, snapshot, created_by)
       VALUES ($1, $2, $3, $4)`,
      [flowId, nextVersion, JSON.stringify(definition), req.user.userId]
    )

    // Atualizar flow
    const updated = await query(
      'UPDATE flows SET status = $1, version = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      ['published', nextVersion, flowId]
    )

    res.json({
      flow: updated.rows[0],
      version: nextVersion,
    })
  } catch (error) {
    console.error('Publish flow error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getFlowVersions(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { flowId } = req.params

    // Verificar acesso
    const accessCheck = await query(
      `SELECT fv.* FROM flow_versions fv
       JOIN flows f ON fv.flow_id = f.id
       JOIN workspaces w ON f.workspace_id = w.id
       WHERE fv.flow_id = $1
       AND (w.owner_id = $2 OR EXISTS (
         SELECT 1 FROM workspace_members wm
         WHERE wm.workspace_id = w.id AND wm.user_id = $2
       ))
       ORDER BY fv.version DESC`,
      [flowId, req.user.userId]
    )

    if (accessCheck.rows.length === 0 && flowId) {
      // Fluxo existe mas sem versões, verificar se é do usuário
      const flowCheck = await query(
        `SELECT f.id FROM flows f
         JOIN workspaces w ON f.workspace_id = w.id
         WHERE f.id = $1
         AND (w.owner_id = $2 OR EXISTS (
           SELECT 1 FROM workspace_members wm
           WHERE wm.workspace_id = w.id AND wm.user_id = $2
         ))`,
        [flowId, req.user.userId]
      )

      if (flowCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' })
      }

      return res.json([])
    }

    res.json(accessCheck.rows)
  } catch (error) {
    console.error('Get flow versions error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
