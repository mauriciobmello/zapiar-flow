import { Router } from 'express'
import { signUp, signIn, getProfile } from '../controllers/auth'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// Public routes
router.post('/auth/signup', signUp)
router.post('/auth/signin', signIn)

// Protected routes
router.get('/auth/profile', authMiddleware, getProfile)

export default router
