import { Router } from 'express'
import { getFlows, createFlow, getFlow, updateFlow, deleteFlow } from '../controllers/flow'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// Protected routes
router.get('/flows', authMiddleware, getFlows)
router.post('/flows', authMiddleware, createFlow)
router.get('/flows/:id', authMiddleware, getFlow)
router.patch('/flows/:id', authMiddleware, updateFlow)
router.delete('/flows/:id', authMiddleware, deleteFlow)

export default router
