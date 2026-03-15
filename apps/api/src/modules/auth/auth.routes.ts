import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma, Prisma } from '@crm/database'
import { loginSchema, registerSchema, DEFAULT_PIPELINE_STAGES } from '@crm/shared'
import { authenticate } from '../../plugins/auth'

const router: Router = Router()

/**
 * Auth routes — all public except GET /me.
 *
 * POST /auth/register  → creates User + Workspace + default Pipeline in a transaction
 * POST /auth/login     → validates credentials and returns a signed JWT
 * GET  /auth/me        → returns the authenticated user's profile and workspaces
 */

// ─── POST /auth/register ────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    const { name, email, password, workspaceName } = parsed.data

    // Check for existing email before starting the transaction
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'E-mail já está em uso',
      })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // Build a URL-safe slug from the workspace name
    const slug = workspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)

    // Ensure the slug is unique by appending a short random suffix when needed
    let finalSlug = slug
    const existingSlug = await prisma.workspace.findUnique({
      where: { slug: finalSlug },
    })
    if (existingSlug) {
      finalSlug = `${slug}-${Math.random().toString(36).slice(2, 7)}`
    }

    // Single transaction: user → workspace → membership → pipeline + stages
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash },
      })

      const workspace = await tx.workspace.create({
        data: { name: workspaceName, slug: finalSlug },
      })

      await tx.workspaceMember.create({
        data: { userId: user.id, workspaceId: workspace.id, role: 'OWNER' },
      })

      const pipeline = await tx.pipeline.create({
        data: {
          workspaceId: workspace.id,
          name: 'Pipeline Principal',
          isDefault: true,
        },
      })

      // Create all default stages in one call
      await tx.pipelineStage.createMany({
        data: DEFAULT_PIPELINE_STAGES.map((stage) => ({
          pipelineId: pipeline.id,
          name: stage.name,
          color: stage.color,
          position: stage.position,
          isWonStage: 'isWonStage' in stage ? stage.isWonStage : false,
          isLostStage: 'isLostStage' in stage ? stage.isLostStage : false,
        })),
      })

      return { user, workspace, pipeline }
    })

    const token = jwt.sign(
      { sub: result.user.id, email: result.user.email },
      process.env.JWT_SECRET ?? 'dev-secret-change-me',
      { expiresIn: '7d' },
    )

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        },
        workspace: {
          id: result.workspace.id,
          name: result.workspace.name,
          slug: result.workspace.slug,
        },
      },
    })
  } catch (err) {
    console.error('[POST /auth/register]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── POST /auth/login ────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })

    // Constant-time comparison even when user is not found to prevent timing attacks
    const passwordMatch =
      user?.passwordHash != null
        ? await bcrypt.compare(password, user.passwordHash)
        : false

    if (!user || !passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'E-mail ou senha inválidos',
      })
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET ?? 'dev-secret-change-me',
      { expiresIn: '7d' },
    )

    return res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email },
      },
    })
  } catch (err) {
    console.error('[POST /auth/login]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET /auth/me ────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        memberships: {
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
                niche: true,
                timezone: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' })
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt,
        workspaces: user.memberships.map((m: any) => ({
          ...m.workspace,
          role: m.role,
        })),
      },
    })
  } catch (err) {
    console.error('[GET /auth/me]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

export { router as authRoutes }
