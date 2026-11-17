import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ErrorBoundary } from './ErrorBoundary'
import { MenuPerfil } from './components/perfil/MenuPerfil'
import { supabase } from './lib/supabase'
import type { Empresa } from './lib/types'
import EmpresaGatePage from './pages/EmpresaGatePage'
import LabControlPage from './pages/LabControlPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

// Lab Control: app separado, copiado do módulo Lab Control do PainelGestaa.
// Usa o mesmo Supabase, o mesmo login e a mesma liberação de acesso
// (tabela `apps`, link interno '/lab-control').
// Rotas: '/' (landing sem login; empresa → Lab Control com login),
// '/entrar' (login) e '/reset-password'.
const INICIO_PATH = '/'
const ENTRAR_PATH = '/entrar'
const RESET_PATH = '/reset-password'
const LAB_INTERNAL_LINK = '/lab-control'
const EMPRESA_STORAGE_KEY = 'empresa_selecionada_lab_control'

interface Usuario {
  nome: string
  email: string
  cargo: string
}

async function carregarAcesso(session: Session) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, ativo, app_access_ids, name, tipo_usuario')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.ativo === false) {
    await supabase.auth.signOut()
    return { permitido: false as const }
  }

  const usuario = montarUsuario(session, profile)

  if (profile?.role === 'admin' || profile?.app_access_ids == null) {
    return { permitido: true as const, temAcessoLab: true, usuario }
  }

  if (profile.app_access_ids.length === 0) {
    return { permitido: true as const, temAcessoLab: false, usuario }
  }

  const { data: apps, error } = await supabase
    .from('apps')
    .select('internal_link')
    .in('id', profile.app_access_ids)

  if (error) return { permitido: true as const, temAcessoLab: true, usuario }

  const temAcessoLab = (apps ?? []).some(app => {
    const link = app.internal_link?.trim() ?? ''
    if (!link || link.startsWith('http')) return false
    return (link.startsWith('/') ? link : '/' + link) === LAB_INTERNAL_LINK
  })

  return { permitido: true as const, temAcessoLab, usuario }
}

function montarUsuario(
  session: Session,
  profile: { role?: string | null; name?: string | null; tipo_usuario?: string | null } | null,
): Usuario {
  const meta = session.user.user_metadata
  const email = session.user.email ?? ''
  const nomeReserva = meta?.full_name
    ?? meta?.name
    ?? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  const cargo = profile?.role === 'admin'
    ? 'Administrador'
    : profile?.tipo_usuario === 'colaborador'
      ? 'Colaborador'
      : profile?.tipo_usuario === 'titular' ? 'Titular' : 'Usuário'
  return { nome: profile?.name?.trim() || nomeReserva, email, cargo }
}

function restaurarEmpresa() {
  try {
    const stored = localStorage.getItem(EMPRESA_STORAGE_KEY)
    return stored ? (JSON.parse(stored) as Empresa) : null
  } catch {
    return null
  }
}

function Carregando() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#16140f',
    }}>
      <div style={{
        width: 28, height: 28,
        border: '3px solid rgba(194, 160, 99, 0.18)',
        borderTopColor: '#c2a063',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function SemAcesso({ onSair }: { onSair: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 28, minHeight: '100vh', boxSizing: 'border-box', padding: '48px 16px',
      background: 'radial-gradient(ellipse 70% 55% at 50% -5%, rgba(194, 160, 99, 0.18) 0%, rgba(194, 160, 99, 0) 70%), #16140f',
      color: '#16140f', fontFamily: "'Hanken Grotesk', 'Segoe UI', system-ui, sans-serif",
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 17, color: '#f4efe3' }}>
        <img src="/symbol-gold.svg" alt="" width={22} height={22} style={{ display: 'block' }} />
        <span>Lab <b style={{ fontWeight: 700 }}>Control</b></span>
      </span>
      <div style={{
        width: '100%', maxWidth: 460, boxSizing: 'border-box', padding: 32,
        background: '#f2eee3', borderRadius: 16, boxShadow: '0 24px 64px rgba(0, 0, 0, 0.45)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <h1 style={{
          margin: 0, fontFamily: "'Sora', 'Hanken Grotesk', system-ui, sans-serif",
          fontSize: 26, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.025em', color: '#16140f',
        }}>
          Acesso ao Lab Control não liberado
        </h1>
        <p style={{ margin: '0 0 12px', fontSize: 15, lineHeight: 1.55, color: '#5f5a4e' }}>
          Sua conta não tem permissão para usar o Lab Control. Peça ao administrador para liberar o acesso.
        </p>
        <button
          type="button"
          onClick={onSair}
          style={{
            width: '100%', background: '#16140f', color: '#f4efe3', border: '1px solid #16140f', borderRadius: 10,
            padding: '13px 18px', font: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Sair
        </button>
      </div>
    </div>
  )
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [temAcessoLab, setTemAcessoLab] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pathname, setPathname] = useState(window.location.pathname)
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false)
  const [empresa, setEmpresa] = useState<Empresa | null>(restaurarEmpresa)

  const navigate = (path: string) => {
    window.history.pushState({}, '', path)
    setPathname(path)
  }

  const irPara = (path: string) => {
    window.history.replaceState({}, '', path)
    setPathname(path)
  }

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) setIsRecoveryFlow(true)

    const aplicarSessao = async (next: Session | null) => {
      if (!next) {
        setSession(null)
        setUsuario(null)
        setTemAcessoLab(false)
        return
      }
      const acesso = await carregarAcesso(next)
      if (!acesso.permitido) {
        setSession(null)
        setUsuario(null)
        setTemAcessoLab(false)
        return
      }
      setSession(next)
      setUsuario(acesso.usuario)
      setTemAcessoLab(acesso.temAcessoLab)
    }

    supabase.auth.getSession().then(async ({ data }) => {
      await aplicarSessao(data.session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecoveryFlow(true)
      // Não aguardar dentro do callback: evita travar o cliente do Supabase.
      void aplicarSessao(next)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Depois do login em /entrar, o app abre na raiz.
  useEffect(() => {
    if (session && pathname === ENTRAR_PATH) irPara(INICIO_PATH)
  }, [session, pathname])

  const selecionarEmpresa = (emp: Empresa) => {
    localStorage.setItem(EMPRESA_STORAGE_KEY, JSON.stringify(emp))
    setEmpresa(emp)
  }

  const trocarEmpresa = useCallback(() => {
    localStorage.removeItem(EMPRESA_STORAGE_KEY)
    setEmpresa(null)
  }, [])

  const sair = useCallback(async () => {
    localStorage.removeItem(EMPRESA_STORAGE_KEY)
    setEmpresa(null)
    await supabase.auth.signOut()
    window.history.replaceState({}, '', INICIO_PATH)
    setPathname(INICIO_PATH)
  }, [])

  if (loading) return <Carregando />

  if (pathname === RESET_PATH) {
    return (
      <ErrorBoundary>
        <ResetPasswordPage
          recoveryMode={isRecoveryFlow}
          onBack={() => {
            setIsRecoveryFlow(false)
            irPara(ENTRAR_PATH)
          }}
          onRecoveryComplete={async () => {
            setIsRecoveryFlow(false)
            await supabase.auth.signOut()
            irPara(ENTRAR_PATH)
          }}
        />
      </ErrorBoundary>
    )
  }

  if (!session || !usuario) {
    if (pathname === ENTRAR_PATH) {
      return (
        <LoginPage
          onForgotPassword={() => navigate(RESET_PATH)}
          onVoltar={() => navigate(INICIO_PATH)}
        />
      )
    }
    return <LandingPage onEntrar={() => navigate(ENTRAR_PATH)} />
  }

  if (!temAcessoLab) return <SemAcesso onSair={sair} />

  if (pathname !== INICIO_PATH) window.history.replaceState({}, '', INICIO_PATH)

  if (!empresa) {
    return (
      <ErrorBoundary>
        <EmpresaGatePage
          onSelecionar={selecionarEmpresa}
          contexto="labs"
          nomeUsuario={usuario.nome}
          emailUsuario={usuario.email}
          menuPerfil={
            <MenuPerfil nome={usuario.nome} email={usuario.email} cargo={usuario.cargo} onSair={() => void sair()} />
          }
        />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <LabControlPage
        userId={session.user.id}
        empresa={empresa}
        onTrocarEmpresa={trocarEmpresa}
        onVoltar={trocarEmpresa}
      />
    </ErrorBoundary>
  )
}

export default App
