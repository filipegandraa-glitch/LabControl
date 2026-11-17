import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ErrorBoundary } from './ErrorBoundary'
import { supabase } from './lib/supabase'
import type { Empresa } from './lib/types'
import EmpresaGatePage from './pages/EmpresaGatePage'
import LabControlPage from './pages/LabControlPage'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

// Lab Control: app separado, copiado do módulo Lab Control do PainelGestaa.
// Usa o mesmo Supabase, o mesmo login e a mesma liberação de acesso
// (tabela `apps`, link interno '/lab-control').
// Rotas: '/' (login → empresa → Lab Control) e '/reset-password'.
const LAB_INTERNAL_LINK = '/lab-control'
const EMPRESA_STORAGE_KEY = 'empresa_selecionada_lab_control'

async function carregarAcesso(session: Session) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, ativo, app_access_ids')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.ativo === false) {
    await supabase.auth.signOut()
    return { permitido: false, temAcessoLab: false }
  }

  if (profile?.role === 'admin' || profile?.app_access_ids == null) {
    return { permitido: true, temAcessoLab: true }
  }

  if (profile.app_access_ids.length === 0) {
    return { permitido: true, temAcessoLab: false }
  }

  const { data: apps, error } = await supabase
    .from('apps')
    .select('internal_link')
    .in('id', profile.app_access_ids)

  if (error) return { permitido: true, temAcessoLab: true }

  const temAcessoLab = (apps ?? []).some(app => {
    const link = app.internal_link?.trim() ?? ''
    if (!link || link.startsWith('http')) return false
    return (link.startsWith('/') ? link : '/' + link) === LAB_INTERNAL_LINK
  })

  return { permitido: true, temAcessoLab }
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
      height: '100vh', background: '#080808',
    }}>
      <div style={{
        width: 28, height: 28,
        border: '3px solid #1e1e1e',
        borderTopColor: '#c9a22a',
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
      gap: 16, minHeight: '100vh', padding: '48px 16px', boxSizing: 'border-box',
      background: '#080808', color: '#f4efe3', textAlign: 'center',
    }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Sem acesso ao Lab Control</h1>
      <p style={{ margin: 0, maxWidth: 420, color: '#b9b2a3' }}>
        Seu usuário não tem o Lab Control liberado. Peça a um administrador para liberar o acesso.
      </p>
      <button
        type="button"
        onClick={onSair}
        style={{
          marginTop: 8, padding: '10px 20px', borderRadius: 8, cursor: 'pointer',
          border: '1px solid #c9a22a', background: 'transparent', color: '#c9a22a', fontSize: 14,
        }}
      >
        Sair
      </button>
    </div>
  )
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [temAcessoLab, setTemAcessoLab] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pathname, setPathname] = useState(window.location.pathname)
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false)
  const [empresa, setEmpresa] = useState<Empresa | null>(restaurarEmpresa)

  const navigate = (path: string) => {
    window.history.pushState({}, '', path)
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
        setTemAcessoLab(false)
        return
      }
      const acesso = await carregarAcesso(next)
      if (!acesso.permitido) {
        setSession(null)
        setTemAcessoLab(false)
        return
      }
      setSession(next)
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
  }, [])

  if (loading) return <Carregando />

  if (pathname === '/reset-password') {
    return (
      <ErrorBoundary>
        <ResetPasswordPage
          recoveryMode={isRecoveryFlow}
          onBack={() => {
            setIsRecoveryFlow(false)
            window.history.replaceState({}, '', '/')
            setPathname('/')
          }}
          onRecoveryComplete={async () => {
            setIsRecoveryFlow(false)
            await supabase.auth.signOut()
            window.history.replaceState({}, '', '/')
            setPathname('/')
          }}
        />
      </ErrorBoundary>
    )
  }

  if (!session) {
    return <LoginPage onForgotPassword={() => navigate('/reset-password')} />
  }

  if (!temAcessoLab) return <SemAcesso onSair={sair} />

  if (!empresa) {
    return (
      <ErrorBoundary>
        <EmpresaGatePage onSelecionar={selecionarEmpresa} onVoltar={sair} contexto="labs" />
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
