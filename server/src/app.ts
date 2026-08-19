import express, { Express } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { healthCheck } from './db/connection.js'
import authRoutes from './routes/auth.js'
import workspaceRoutes from './routes/workspace.js'
import flowRoutes from './routes/flow.js'
import flowDefinitionRoutes from './routes/flowDefinition.js'
import runRoutes from './routes/run.js'

dotenv.config()

// Bare API app — no static serving, no listen(), no error handler. Each
// entrypoint (Docker's index.ts, Vercel's api/index.ts) adds its own tail
// (static/SPA fallback where relevant, then the error handler last).
const app: Express = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}
app.use(cors(corsOptions))

app.use('/api', authRoutes)
app.use('/api', workspaceRoutes)
app.use('/api', flowRoutes)
app.use('/api', flowDefinitionRoutes)
app.use('/api', runRoutes)

app.get('/health', async (req, res) => {
  const dbHealthy = await healthCheck()
  res.json({
    status: dbHealthy ? 'ok' : 'database_error',
    timestamp: new Date().toISOString(),
  })
})

// Unmatched API routes get a JSON 404, not whatever the entrypoint adds after this
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' })
})

export default app
