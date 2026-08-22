import app from '../server/src/app.js'

export default function handler(req, res) {
  const url = req.url || '/'

  if (process.env.VERCEL && url !== '/health') {
    req.url = `/api${url}`
  }

  return app(req, res)
}
