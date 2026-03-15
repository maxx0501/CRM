// Re-export the singleton Prisma client from the shared database package.
// All route modules should import from this path to avoid multiple instances.
export { prisma } from '@crm/database'
