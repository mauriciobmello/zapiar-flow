import express from 'express'
import app from '../server/src/app.js'

// Vercel serves the built frontend from its own CDN (see vercel.json), so this
// function only ever handles /api/* and /health — no static serving here.
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
})

export default app
