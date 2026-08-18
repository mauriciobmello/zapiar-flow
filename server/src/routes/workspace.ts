import { Router } from 'express'
import { getWorkspaces, createWorkspace, getWorkspace } from '../controllers/workspace.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// Protected routes
router.get('/workspaces', authMiddleware, getWorkspaces)
router.post('/workspaces', authMiddleware, createWorkspace)
router.get('/workspaces/:id', authMiddleware, getWorkspace)

export default router
