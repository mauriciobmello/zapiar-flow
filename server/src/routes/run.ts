import { Router } from 'express'
import { startExecution, replyExecution, receiveWebhook, pollExecution } from '../controllers/run'

const router = Router()

// Public routes — this is the runtime end users interact with, not the editor API
router.post('/run/:flowId/start', startExecution)
router.post('/run/:flowId/:executionId/reply', replyExecution)
router.get('/run/:flowId/:executionId/poll', pollExecution)

// Called by external systems, identified by executionId alone (see receiveWebhook)
router.post('/webhook/:executionId', receiveWebhook)

export default router
