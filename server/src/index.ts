import express, { Express } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { healthCheck } from './db/connection'
import authRoutes from './routes/auth'
import workspaceRoutes from './routes/workspace'
import flowRoutes from './routes/flow'
import flowDefinitionRoutes from './routes/flowDefinition'
import runRoutes from './routes/run'

dotenv.config()

const app: Express = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}
app.use(cors(corsOptions))

// Routes
app.use('/api', authRoutes)
app.use('/api', workspaceRoutes)
app.use('/api', flowRoutes)
app.use('/api', flowDefinitionRoutes)
app.use('/api', runRoutes)

// Health check
app.get('/health', async (req, res) => {
  const dbHealthy = await healthCheck()
  res.json({
    status: dbHealthy ? 'ok' : 'database_error',
    timestamp: new Date().toISOString(),
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`📝 API URL: ${process.env.API_URL}`)
})

export default app
