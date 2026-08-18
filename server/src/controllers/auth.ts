import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db/connection'
import { generateToken } from '../utils/jwt'
import { v4 as uuidv4 } from 'uuid'

export async function signUp(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body

    // Validação básica
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' })
    }

    // Verificar se usuário já existe
    const userExists = await query('SELECT id FROM users WHERE email = $1', [email])
    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 12)

    // Criar usuário
    const userId = uuidv4()
    const result = await query(
      'INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4) RETURNING id, email, name, created_at',
      [userId, email, passwordHash, name]
    )

    const user = result.rows[0]

    // Gerar token
    const token = generateToken(user.id, user.email)

    // Criar workspace padrão
    const workspaceId = uuidv4()
    await query(
      'INSERT INTO workspaces (id, owner_id, name) VALUES ($1, $2, $3)',
      [workspaceId, user.id, `${name}'s Workspace`]
    )

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    })
  } catch (error) {
    console.error('Sign up error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function signIn(req: Request, res: Response) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Buscar usuário
    const result = await query('SELECT id, email, name, password_hash FROM users WHERE email = $1', [email])

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = result.rows[0]

    // Validar senha
    const passwordValid = await bcrypt.compare(password, user.password_hash)

    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Gerar token
    const token = generateToken(user.id, user.email)

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    })
  } catch (error) {
    console.error('Sign in error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getProfile(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const result = await query('SELECT id, email, name, created_at FROM users WHERE id = $1', [req.user.userId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
