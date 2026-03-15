import { Request, Response, NextFunction } from 'express'
import { authenticate } from './auth'
import { prisma } from '../utils/prisma'

/**
 * Express middleware that:
 *   1. Authenticates the JWT (delegates to authenticate)
 *   2. Reads the x-workspace-id header
 *   3. Verifies the user is a member of that workspace
 *
 * Sets req.workspaceId on success; responds 400/403 on failure.
 */
export function requireWorkspace(req: Request, res: Response, next: NextFunction): void {
  // Run authentication first, then continue with workspace validation
  authenticate(req, res, async () => {
    const workspaceId = req.headers['x-workspace-id'] as string | undefined

    if (!workspaceId) {
      res.status(400).json({ success: false, error: 'Missing x-workspace-id header' })
      return
    }

    try {
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.userId!,
            workspaceId,
          },
        },
      })

      if (!membership) {
        res.status(403).json({ success: false, error: 'Not a member of this workspace' })
        return
      }

      req.workspaceId = workspaceId
      next()
    } catch (err) {
      console.error('[requireWorkspace] Database error:', err)
      res.status(500).json({ success: false, error: 'Internal server error' })
    }
  })
}
