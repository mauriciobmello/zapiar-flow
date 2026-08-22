import app from '../server/src/app.js'

app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', err)
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
})

export default app
