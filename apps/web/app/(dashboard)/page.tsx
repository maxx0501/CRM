import { redirect } from 'next/navigation'

// A rota raiz "/" redireciona usuários autenticados para /dashboard.
// Usuários não autenticados verão a landing page (app/page.tsx tem prioridade
// sobre esse grupo pois é um page.tsx direto na raiz do app).
export default function DashboardRootPage() {
  redirect('/dashboard')
}
