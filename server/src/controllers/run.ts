import { Request, Response } from 'express'
import { query } from '../db/connection'
import { advance } from '../engine/executor'
import type { ExecutionContext, FlowDefinition } from '../engine/types'

async function loadPublishedDefinition(flowId: string): Promise<FlowDefinition | null> {
  const flowResult = await query('SELECT status FROM flows WHERE id = $1', [flowId])
  if (flowResult.rows.length === 0 || flowResult.rows[0].status !== 'published') {
    return null
  }

  const versionResult = await query(
    'SELECT snapshot FROM flow_versions WHERE flow_id = $1 ORDER BY version DESC LIMIT 1',
    [flowId]
  )
  if (versionResult.rows.length === 0) return null

  return versionResult.rows[0].snapshot as FlowDefinition
}

export async function startExecution(req: Request, res: Response) {
  try {
    const { flowId } = req.params

    const definition = await loadPublishedDefinition(flowId)
    if (!definition) {
      return res.status(404).json({ error: 'Flow not found or not published' })
    }

    const result = await advance(definition, { variables: {}, currentNodeId: null })

    const inserted = await query(
      `INSERT INTO executions (flow_id, status, context, finished_at)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [flowId, result.finished ? 'completed' : 'waiting', JSON.stringify(result.context), result.finished ? new Date() : null]
    )

    res.status(201).json({
      executionId: inserted.rows[0].id,
      messages: result.messages,
      waitingFor: result.waitingFor,
      options: result.options,
      finished: result.finished,
    })
  } catch (error) {
    console.error('Start execution error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function replyExecution(req: Request, res: Response) {
  try {
    const { flowId, executionId } = req.params
    const { input } = req.body

    if (input === undefined || input === null || input === '') {
      return res.status(400).json({ error: 'input is required' })
    }

    const execResult = await query('SELECT status, context FROM executions WHERE id = $1 AND flow_id = $2', [
      executionId,
      flowId,
    ])
    if (execResult.rows.length === 0) {
      return res.status(404).json({ error: 'Execution not found' })
    }
    if (execResult.rows[0].status !== 'waiting') {
      return res.status(410).json({ error: 'Execution already finished' })
    }

    const definition = await loadPublishedDefinition(flowId)
    if (!definition) {
      return res.status(404).json({ error: 'Flow not found or not published' })
    }

    const context = execResult.rows[0].context as ExecutionContext
    const result = await advance(definition, context, String(input))

    await query(
      `UPDATE executions SET status = $1, context = $2, finished_at = $3 WHERE id = $4`,
      [result.finished ? 'completed' : 'waiting', JSON.stringify(result.context), result.finished ? new Date() : null, executionId]
    )

    res.json({
      executionId,
      messages: result.messages,
      waitingFor: result.waitingFor,
      options: result.options,
      finished: result.finished,
    })
  } catch (error) {
    console.error('Reply execution error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Called by an external system (not our own frontend) to resume an execution
// paused at a webhook node. Identified by executionId alone — same
// unguessable-UUID security model already used by /reply.
export async function receiveWebhook(req: Request, res: Response) {
  try {
    const { executionId } = req.params

    const execResult = await query('SELECT flow_id, status, context FROM executions WHERE id = $1', [executionId])
    if (execResult.rows.length === 0) {
      return res.status(404).json({ error: 'Execution not found' })
    }

    const execution = execResult.rows[0]
    if (execution.status !== 'waiting') {
      return res.status(410).json({ error: 'Execution is not waiting' })
    }

    const definition = await loadPublishedDefinition(execution.flow_id)
    if (!definition) {
      return res.status(404).json({ error: 'Flow not found or not published' })
    }

    const context = execution.context as ExecutionContext
    const waitingNode = definition.nodes.find((n) => n.id === context.currentNodeId)
    if (!waitingNode || waitingNode.type !== 'webhook') {
      return res.status(409).json({ error: 'Execution is not waiting for a webhook' })
    }

    const payload = JSON.stringify(req.body ?? {})
    const result = await advance(definition, context, payload)

    // The chat page (RunFlow) has no way to know this just happened — it's
    // triggered by an external system, not a browser click. Stash what
    // changed alongside the context so the poll endpoint can hand it over on
    // its next check, then clear it so it's only delivered once.
    const newContext = {
      ...result.context,
      _pending: { messages: result.messages, waitingFor: result.waitingFor, options: result.options, finished: result.finished },
    }

    await query(
      `UPDATE executions SET status = $1, context = $2, finished_at = $3 WHERE id = $4`,
      [result.finished ? 'completed' : 'waiting', JSON.stringify(newContext), result.finished ? new Date() : null, executionId]
    )

    res.json({ received: true })
  } catch (error) {
    console.error('Webhook receive error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Polled by RunFlow while waitingFor === 'webhook', since nothing in the
// browser can otherwise learn that an external call resumed the execution.
export async function pollExecution(req: Request, res: Response) {
  try {
    const { flowId, executionId } = req.params

    const execResult = await query('SELECT status, context FROM executions WHERE id = $1 AND flow_id = $2', [
      executionId,
      flowId,
    ])
    if (execResult.rows.length === 0) {
      return res.status(404).json({ error: 'Execution not found' })
    }

    const context = execResult.rows[0].context as ExecutionContext & { _pending?: unknown }
    if (!context._pending) {
      return res.json({ changed: false })
    }

    const pending = context._pending as {
      messages: unknown
      waitingFor: unknown
      options: unknown
      finished: unknown
    }

    const { _pending, ...clearedContext } = context
    await query('UPDATE executions SET context = $1 WHERE id = $2', [JSON.stringify(clearedContext), executionId])

    res.json({ changed: true, executionId, ...pending })
  } catch (error) {
    console.error('Poll execution error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
