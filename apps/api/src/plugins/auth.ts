import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// Extend Express Request to carry decoded JWT fields
declare global {
  namespace Express {
    interface Request {
      userId?: string
      workspaceId?: string
    }
  }
}

/**
 * Express middleware that validates the Bearer JWT in the Authorization header.
 * Sets req.userId on success; responds 401 on failure.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? 'dev-secret-change-me') as {
      sub: string
      email: string
    }
    req.userId = payload.sub
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' })
  }
}
