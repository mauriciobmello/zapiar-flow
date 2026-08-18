import { Router } from 'express'
import { getWorkspaces, createWorkspace, getWorkspace } from '../controllers/workspace'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// Protected routes
router.get('/workspaces', authMiddleware, getWorkspaces)
router.post('/workspaces', authMiddleware, createWorkspace)
router.get('/workspaces/:id', authMiddleware, getWorkspace)

export default router
