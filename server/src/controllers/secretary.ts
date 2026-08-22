import { Request, Response } from 'express'
import { query, getClient } from '../db/connection.js'
import { v4 as uuidv4 } from 'uuid'
import {
  discoverBusinessProfile,
  generateFlow,
  explainFlow,
  FlowGenerationError,
} from '../services/openai.js'
import type { BusinessProfile } from '../models/secretary.js'

interface DiscoverMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function discover(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { messages } = req.body as { messages: DiscoverMessage[] }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' })
    }

    const result = await discoverBusinessProfile(messages)
    res.json(result)
  } catch (error) {
    console.error('Discover error:', error)
    res.status(502).json({ error: 'Failed to process request, please try again' })
  }
}

interface CreateAgentBody {
  workspaceId: string
  profile: Omit<BusinessProfile, 'id' | 'workspaceId'>
  request: string
}

export async function createAgent(req: Request, res: Response) {
  const client = await (await import('../db/connection.js')).getClient()

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { workspaceId, profile, request } = req.body as CreateAgentBody

    if (!workspaceId || !profile || !request) {
      return res.status(400).json({ error: 'workspaceId, profile, and request are required' })
    }

    const accessCheck = await client.query(
      `SELECT w.id FROM workspaces w
       WHERE w.id = $1
       AND (w.owner_id = $2 OR EXISTS (
         SELECT 1 FROM workspace_members wm
         WHERE wm.workspace_id = w.id AND wm.user_id = $2
       ))`,
      [workspaceId, req.user.userId]
    )

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' })
    }

    await client.query('BEGIN')

    const profileId = uuidv4()
    await client.query(
      `INSERT INTO business_profiles (
        id, workspace_id, business_name, segment, subsegment, business_model,
        customers, products, services, channels, departments, business_hours,
        operational_processes, communication_style, restrictions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        profileId,
        workspaceId,
        profile.businessName,
        profile.segment,
        profile.subsegment || null,
        profile.businessModel || null,
        profile.customers,
        profile.products || null,
        profile.services || null,
        profile.channels,
        profile.departments || null,
        profile.businessHours ? JSON.stringify(profile.businessHours) : null,
        profile.operationalProcesses || null,
        profile.communicationStyle || null,
        profile.restrictions || null,
      ]
    )

    const flowDef = await generateFlow(profile, request)

    const flowId = uuidv4()
    await client.query(
      'INSERT INTO flows (id, workspace_id, name, description) VALUES ($1, $2, $3, $4)',
      [flowId, workspaceId, flowDef.name, flowDef.description || null]
    )

    await client.query(
      'INSERT INTO flow_definitions (flow_id, definition) VALUES ($1, $2)',
      [flowId, JSON.stringify(flowDef)]
    )

    const agentId = uuidv4()
    await client.query(
      `INSERT INTO secretary_agents (
        id, workspace_id, business_profile_id, flow_id, name, description, autonomy_level, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [agentId, workspaceId, profileId, flowId, `Secretaria - ${profile.businessName}`, `Agente gerado a partir do perfil de ${profile.businessName}`, 'assistida', 'draft']
    )

    await client.query('COMMIT')

    res.status(201).json({ agentId, flowId })
  } catch (error) {
    await client.query('ROLLBACK')

    if (error instanceof FlowGenerationError) {
      console.error('Flow generation failed after retry:', error.message)
      return res.status(422).json({
        error: 'Failed to generate a valid flow. Please rephrase your request and try again.',
      })
    }

    console.error('Create agent error:', error)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    client.release()
  }
}

export async function getAgent(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { id } = req.params

    const result = await query(
      `SELECT sa.*, bp.* FROM secretary_agents sa
       JOIN business_profiles bp ON sa.business_profile_id = bp.id
       JOIN workspaces w ON sa.workspace_id = w.id
       WHERE sa.id = $1
       AND (w.owner_id = $2 OR EXISTS (
         SELECT 1 FROM workspace_members wm
         WHERE wm.workspace_id = w.id AND wm.user_id = $2
       ))`,
      [id, req.user.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    const row = result.rows[0]
    res.json({
      id: row.id,
      workspaceId: row.workspace_id,
      businessProfileId: row.business_profile_id,
      flowId: row.flow_id,
      name: row.name,
      description: row.description,
      autonomyLevel: row.autonomy_level,
      status: row.status,
      systemInstructions: row.system_instructions,
      profile: {
        id: row.business_profile_id,
        workspaceId: row.workspace_id,
        businessName: row.business_name,
        segment: row.segment,
        subsegment: row.subsegment,
        businessModel: row.business_model,
        customers: row.customers,
        products: row.products,
        services: row.services,
        channels: row.channels,
        departments: row.departments,
        businessHours: row.business_hours,
        operationalProcesses: row.operational_processes,
        communicationStyle: row.communication_style,
        restrictions: row.restrictions,
      },
    })
  } catch (error) {
    console.error('Get agent error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function explainAgentFlow(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { id } = req.params

    const agentCheck = await query(
      `SELECT sa.id, fd.definition FROM secretary_agents sa
       JOIN workspaces w ON sa.workspace_id = w.id
       JOIN flow_definitions fd ON fd.flow_id = sa.flow_id
       WHERE sa.id = $1
       AND (w.owner_id = $2 OR EXISTS (
         SELECT 1 FROM workspace_members wm
         WHERE wm.workspace_id = w.id AND wm.user_id = $2
       ))`,
      [id, req.user.userId]
    )

    if (agentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    const definition = agentCheck.rows[0].definition
    const explanation = await explainFlow(definition)

    res.json({ explanation })
  } catch (error) {
    console.error('Explain flow error:', error)
    res.status(502).json({ error: 'Failed to generate explanation, please try again' })
  }
}
