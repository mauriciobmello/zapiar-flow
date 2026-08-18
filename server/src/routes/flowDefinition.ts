import { Router } from 'express'
import {
  getFlowDefinition,
  saveFlowDefinition,
  publishFlow,
  getFlowVersions,
} from '../controllers/flowDefinition.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// Protected routes
router.get('/flows/:flowId/definition', authMiddleware, getFlowDefinition)
router.post('/flows/:flowId/definition', authMiddleware, saveFlowDefinition)
router.post('/flows/:flowId/publish', authMiddleware, publishFlow)
router.get('/flows/:flowId/versions', authMiddleware, getFlowVersions)

export default router
