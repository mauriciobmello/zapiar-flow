import { Router } from 'express'
import { discover, createAgent, getAgent, explainAgentFlow } from '../controllers/secretary.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.post('/secretary/discover', authMiddleware, discover)
router.post('/secretary/agents', authMiddleware, createAgent)
router.get('/secretary/agents/:id', authMiddleware, getAgent)
router.post('/secretary/agents/:id/explain', authMiddleware, explainAgentFlow)

export default router
