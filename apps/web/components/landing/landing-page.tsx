'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, ArrowRight, CheckCircle2, Kanban, Calendar, DollarSign, MessageSquare, Zap, BarChart3, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Theme Toggle inline (landing page nao usa o Header do app) ───────────────
function LandingThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="h-9 w-9" />
  const isDark = resolvedTheme === 'dark'
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-white/10 dark:hover:bg-white/10"
      aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

// ─── Feature data ──────────────────────────────────────────────────────────────
const features = [
  {
    icon: Kanban,
    title: 'Pipeline Kanban',
    description: 'Visualize e gerencie todo o seu funil de vendas com drag-and-drop intuitivo. Mova leads entre etapas em segundos.',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    icon: Calendar,
    title: 'Agendamentos',
    description: 'Organize sua agenda e compromissos com clientes. Receba lembretes automáticos e nunca perca uma reunião.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: DollarSign,
    title: 'Financeiro',
    description: 'Controle receitas, despesas e comissões em um só lugar. Relatórios detalhados do seu negócio em tempo real.',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp & Conversas',
    description: 'Centralize todas as suas conversas com clientes. Integração nativa com WhatsApp para nunca perder um contato.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Zap,
    title: 'Automações',
    description: 'Automatize tarefas repetitivas: follow-ups, mensagens de boas-vindas, cobranças e muito mais.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    icon: BarChart3,
    title: 'Dashboard & Relatórios',
    description: 'Tenha uma visão completa do seu negócio com métricas em tempo real. Tome decisões baseadas em dados.',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
]

// ─── Steps data ────────────────────────────────────────────────────────────────
const steps = [
  {
    number: '01',
    title: 'Crie sua conta',
    description: 'Cadastro gratuito em menos de 2 minutos. Sem cartão de crédito necessário para começar.',
  },
  {
    number: '02',
    title: 'Configure seu workspace',
    description: 'Personalize seu pipeline, importe seus contatos e configure as integrações que você precisa.',
  },
  {
    number: '03',
    title: 'Comece a vender',
    description: 'Com tudo configurado, foque no que importa: fechar negócios e crescer seu negócio.',
  },
]

// ─── Main Component ────────────────────────────────────────────────────────────
export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Kanban className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">CRM Pro</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Funcionalidades
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Como funciona
            </a>
          </nav>

          {/* Desktop actions */}
          <div className="hidden items-center gap-2 md:flex">
            <LandingThemeToggle />
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Começar Grátis
            </Link>
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-1 md:hidden">
            <LandingThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border/40 bg-background/95 backdrop-blur-md md:hidden">
            <nav className="flex flex-col gap-1 p-4">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Funcionalidades
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Como funciona
              </a>
              <div className="mt-2 flex flex-col gap-2 border-t border-border/40 pt-4">
                <Link
                  href="/login"
                  className="rounded-md border border-border px-4 py-2.5 text-center text-sm font-medium transition-colors hover:bg-accent"
                >
                  Entrar
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Começar Grátis
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* ── Hero Section ── */}
        <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28 lg:px-8">
          {/* Gradient background blobs */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          >
            <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px] dark:bg-primary/10" />
            <div className="absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-violet-500/15 blur-[100px] dark:bg-violet-500/10" />
          </div>

          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Feito para profissionais autônomos
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Gerencie seus clientes{' '}
              <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                sem complicação
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              O CRM Pro foi criado pensando em freelancers, consultores e autônomos que precisam de uma ferramenta poderosa, simples e acessível para organizar e crescer seus negócios.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-8 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 sm:w-auto"
              >
                Começar Grátis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-border px-8 text-sm font-semibold transition-colors hover:bg-accent sm:w-auto"
              >
                Saiba Mais
              </a>
            </div>

            {/* Social proof */}
            <div className="mt-12 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-6">
              {[
                'Sem cartão de crédito',
                'Setup em minutos',
                'Suporte em português',
              ].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Hero dashboard mockup */}
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/10 dark:shadow-black/40">
              {/* Browser chrome */}
              <div className="flex h-10 items-center gap-2 border-b border-border/60 bg-muted/30 px-4">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                <div className="ml-4 flex-1 rounded-md bg-muted/60 px-3 py-1 text-center text-xs text-muted-foreground">
                  app.crmpro.com.br/pipeline
                </div>
              </div>
              {/* Kanban mockup */}
              <div className="flex gap-3 overflow-x-auto p-4 sm:p-6">
                {[
                  { label: 'Prospecção', count: 5, color: 'bg-blue-500' },
                  { label: 'Proposta Enviada', count: 3, color: 'bg-amber-500' },
                  { label: 'Negociação', count: 2, color: 'bg-violet-500' },
                  { label: 'Fechado', count: 8, color: 'bg-green-500' },
                ].map((col) => (
                  <div key={col.label} className="flex w-48 min-w-[10rem] flex-col gap-2 sm:w-56">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className={cn('h-2 w-2 rounded-full', col.color)} />
                        <span className="text-xs font-medium">{col.label}</span>
                      </div>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {col.count}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {Array.from({ length: Math.min(col.count, 3) }).map((_, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-border/60 bg-background p-3 shadow-sm"
                        >
                          <div className="mb-2 h-2.5 w-3/4 rounded-full bg-muted" />
                          <div className="h-2 w-1/2 rounded-full bg-muted/60" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Features Section ── */}
        <section id="features" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Tudo que você precisa para{' '}
                <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                  crescer seu negócio
                </span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Ferramentas completas para autônomos que querem organização, produtividade e mais vendas — sem a complexidade de um CRM corporativo.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-border/60 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className={cn('mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl', feature.bg)}>
                    <feature.icon className={cn('h-6 w-6', feature.color)} />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section
          id="how-it-works"
          className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
        >
          <div className="mx-auto max-w-5xl">
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Simples de começar,{' '}
                <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                  poderoso para crescer
                </span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Em três passos você já tem seu CRM funcionando e gerando resultados.
              </p>
            </div>

            <div className="relative">
              {/* Connecting line on desktop */}
              <div
                aria-hidden
                className="absolute left-1/2 top-8 hidden h-0.5 w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-border to-transparent lg:block"
              />

              <div className="grid gap-8 lg:grid-cols-3">
                {steps.map((step, idx) => (
                  <div key={step.number} className="relative flex flex-col items-center text-center">
                    {/* Step number badge */}
                    <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                      <span className="text-2xl font-bold">{step.number}</span>
                      {idx < steps.length - 1 && (
                        <div
                          aria-hidden
                          className="absolute -right-4 top-1/2 hidden -translate-y-1/2 lg:block"
                        >
                          <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                    <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="px-4 pb-24 sm:px-6 sm:pb-32 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center sm:px-16">
              {/* Background decoration */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl"
              >
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              </div>

              <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
                Pronto para organizar seu negócio?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
                Junte-se a centenas de autônomos que ja usam o CRM Pro para fechar mais negócios e ter mais controle sobre sua rotina.
              </p>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/register"
                  className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white px-8 text-sm font-semibold text-primary transition-all hover:bg-white/90 sm:w-auto"
                >
                  Criar conta gratuita
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-white/30 px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-white/10 sm:w-auto"
                >
                  Ja tenho conta
                </Link>
              </div>

              <p className="mt-6 text-xs text-primary-foreground/60">
                Grátis para começar. Sem cartão de crédito.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
            {/* Brand */}
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                  <Kanban className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="font-bold">CRM Pro</span>
              </Link>
              <p className="text-center text-xs text-muted-foreground sm:text-left">
                Gestão de clientes para profissionais autônomos
              </p>
            </div>

            {/* Links */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground sm:justify-end">
              <Link href="/login" className="transition-colors hover:text-foreground">
                Entrar
              </Link>
              <Link href="/register" className="transition-colors hover:text-foreground">
                Criar conta
              </Link>
              <a href="#features" className="transition-colors hover:text-foreground">
                Funcionalidades
              </a>
            </div>
          </div>

          <div className="mt-8 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} CRM Pro. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
