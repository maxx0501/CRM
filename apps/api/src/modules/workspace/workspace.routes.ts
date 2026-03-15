import { Router } from 'express'
import { prisma, Prisma } from '@crm/database'
import { createWorkspaceSchema, updateWorkspaceSchema } from '@crm/shared'
import { authenticate } from '../../plugins/auth'

const router: Router = Router()

/**
 * Workspace routes.
 *
 * GET    /workspaces          → list workspaces the authenticated user belongs to
 * POST   /workspaces          → create a new workspace (user becomes OWNER)
 * GET    /workspaces/current  → get workspace by x-workspace-id header
 * PATCH  /workspaces/current  → update workspace by x-workspace-id header
 * GET    /workspaces/:id      → get a single workspace (must be a member)
 * PATCH  /workspaces/:id      → update workspace settings (must be a member)
 * DELETE /workspaces/:id      → delete workspace (must be OWNER)
 */

// All routes in this module require JWT auth (but NOT a workspace header,
// since listing workspaces is how the frontend picks a workspace).
router.use(authenticate)

// ─── GET / ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.userId },
      include: {
        workspace: {
          include: {
            _count: { select: { leads: true, members: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return res.json({
      success: true,
      data: memberships.map((m: any) => ({
        ...m.workspace,
        role: m.role,
      })),
    })
  } catch (err) {
    console.error('[GET /workspaces]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── POST / ──────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const parsed = createWorkspaceSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    const { name, slug, niche } = parsed.data

    const slugExists = await prisma.workspace.findUnique({ where: { slug } })
    if (slugExists) {
      return res.status(409).json({
        success: false,
        error: 'Slug já está em uso',
      })
    }

    const workspace = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const ws = await tx.workspace.create({ data: { name, slug, niche } })
      await tx.workspaceMember.create({
        data: { userId: req.userId!, workspaceId: ws.id, role: 'OWNER' },
      })
      return ws
    })

    return res.status(201).json({ success: true, data: workspace })
  } catch (err) {
    console.error('[POST /workspaces]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET /current ────────────────────────────────────────────
// Must be before /:id to avoid route conflicts
router.get('/current', async (req, res) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string | undefined
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'Header x-workspace-id obrigatório' })
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.userId!, workspaceId } },
      include: { workspace: true },
    })

    if (!membership) {
      return res.status(404).json({ success: false, error: 'Workspace não encontrado' })
    }

    return res.json({ success: true, data: { ...membership.workspace, role: membership.role } })
  } catch (err) {
    console.error('[GET /workspaces/current]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── PATCH /current ──────────────────────────────────────────
// Must be before /:id to avoid route conflicts
router.patch('/current', async (req, res) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string | undefined
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'Header x-workspace-id obrigatório' })
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.userId!, workspaceId } },
    })

    if (!membership) {
      return res.status(404).json({ success: false, error: 'Workspace não encontrado' })
    }

    const parsed = updateWorkspaceSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    if (parsed.data.slug) {
      const slugExists = await prisma.workspace.findFirst({
        where: { slug: parsed.data.slug, NOT: { id: workspaceId } },
      })
      if (slugExists) {
        return res.status(409).json({ success: false, error: 'Slug já está em uso' })
      }
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: parsed.data,
    })

    return res.json({ success: true, data: workspace })
  } catch (err) {
    console.error('[PATCH /workspaces/current]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET /:id ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: req.userId!, workspaceId: id },
      },
      include: { workspace: true },
    })

    if (!membership) {
      return res.status(404).json({ success: false, error: 'Workspace não encontrado' })
    }

    return res.json({
      success: true,
      data: { ...membership.workspace, role: membership.role },
    })
  } catch (err) {
    console.error('[GET /workspaces/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── PATCH /:id ──────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: req.userId!, workspaceId: id },
      },
    })

    if (!membership) {
      return res.status(404).json({ success: false, error: 'Workspace não encontrado' })
    }

    const parsed = updateWorkspaceSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    if (parsed.data.slug) {
      const slugExists = await prisma.workspace.findFirst({
        where: { slug: parsed.data.slug, NOT: { id } },
      })
      if (slugExists) {
        return res.status(409).json({ success: false, error: 'Slug já está em uso' })
      }
    }

    const workspace = await prisma.workspace.update({
      where: { id },
      data: parsed.data,
    })

    return res.json({ success: true, data: workspace })
  } catch (err) {
    console.error('[PATCH /workspaces/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── DELETE /:id ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: req.userId!, workspaceId: id },
      },
    })

    if (!membership) {
      return res.status(404).json({ success: false, error: 'Workspace não encontrado' })
    }

    if (membership.role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        error: 'Apenas o proprietário pode excluir o workspace',
      })
    }

    await prisma.workspace.delete({ where: { id } })

    return res.json({ success: true, data: null })
  } catch (err) {
    console.error('[DELETE /workspaces/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

export { router as workspaceRoutes }
