import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { LandingPage } from '@/components/landing/landing-page'

export default async function HomePage() {
  // Redireciona usuários autenticados direto para o dashboard
  let session = null
  try {
    session = await auth()
  } catch {
    // Se auth falhar fora do contexto, continua exibindo a landing page
  }

  if (session?.user) {
    redirect('/dashboard')
  }

  return <LandingPage />
}
