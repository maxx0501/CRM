import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo user
  const passwordHash = await hash('password123', 12)
  const user = await prisma.user.upsert({
    where: { email: 'demo@crm.com' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@crm.com',
      passwordHash,
    },
  })

  // Create demo workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'demo-clinic' },
    update: {},
    create: {
      name: 'Demo Clinic',
      slug: 'demo-clinic',
      niche: 'physiotherapy',
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  })

  // Create default pipeline with stages
  const pipeline = await prisma.pipeline.upsert({
    where: { id: 'default-pipeline' },
    update: {},
    create: {
      id: 'default-pipeline',
      workspaceId: workspace.id,
      name: 'Sales Pipeline',
      isDefault: true,
      stages: {
        create: [
          { name: 'New Lead', color: '#6366f1', position: 0 },
          { name: 'Contacted', color: '#f59e0b', position: 1 },
          { name: 'Qualified', color: '#3b82f6', position: 2 },
          { name: 'Proposal', color: '#8b5cf6', position: 3 },
          { name: 'Won', color: '#22c55e', position: 4, isWonStage: true },
          { name: 'Lost', color: '#ef4444', position: 5, isLostStage: true },
        ],
      },
    },
  })

  // Create some demo tags
  const tags = await Promise.all(
    ['VIP', 'Urgent', 'Follow-up', 'New Patient', 'Returning'].map((name) =>
      prisma.tag.upsert({
        where: { workspaceId_name: { workspaceId: workspace.id, name } },
        update: {},
        create: {
          workspaceId: workspace.id,
          name,
          color: name === 'VIP' ? '#f59e0b' : name === 'Urgent' ? '#ef4444' : '#6366f1',
        },
      }),
    ),
  )

  // Create demo leads
  const stages = await prisma.pipelineStage.findMany({
    where: { pipelineId: pipeline.id },
    orderBy: { position: 'asc' },
  })

  const demoLeads = [
    { name: 'Maria Silva', phone: '+5511999990001', email: 'maria@email.com', stageIdx: 0 },
    { name: 'João Santos', phone: '+5511999990002', email: 'joao@email.com', stageIdx: 1 },
    { name: 'Ana Oliveira', phone: '+5511999990003', email: 'ana@email.com', stageIdx: 2 },
    { name: 'Pedro Costa', phone: '+5511999990004', email: 'pedro@email.com', stageIdx: 0 },
    { name: 'Lucia Ferreira', phone: '+5511999990005', email: 'lucia@email.com', stageIdx: 3 },
  ]

  for (const [i, lead] of demoLeads.entries()) {
    await prisma.lead.create({
      data: {
        workspaceId: workspace.id,
        stageId: stages[lead.stageIdx].id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: 'MANUAL',
        position: i,
        activities: {
          create: {
            type: 'LEAD_CREATED',
            description: `Lead ${lead.name} created`,
          },
        },
      },
    })
  }

  console.log('✅ Seed completed!')
  console.log(`   User: demo@crm.com / password123`)
  console.log(`   Workspace: ${workspace.name} (${workspace.slug})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
