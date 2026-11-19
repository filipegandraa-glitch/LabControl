import { useEffect, useSyncExternalStore } from 'react'

// Tema claro/escuro do LabControl. Vale só para a área depois da escolha de
// empresa: a página aplica o tema em <html data-theme> enquanto está montada e
// remove ao sair, então landing, login e escolha de empresa ficam sempre escuras.
// Padrão: escuro. A escolha fica salva neste navegador.
export type Tema = 'dark' | 'light'

const CHAVE = 'lab_tema'
const ouvintes = new Set<() => void>()

function lerTemaSalvo(): Tema {
  try { return localStorage.getItem(CHAVE) === 'light' ? 'light' : 'dark' } catch { return 'dark' }
}

let temaAtual: Tema = lerTemaSalvo()

function definirTema(tema: Tema) {
  temaAtual = tema
  try { localStorage.setItem(CHAVE, tema) } catch { /* modo privado etc. */ }
  ouvintes.forEach(ouvinte => ouvinte())
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  return () => { ouvintes.delete(ouvinte) }
}

export function useTema() {
  const tema = useSyncExternalStore(assinar, () => temaAtual)
  const alternar = () => definirTema(tema === 'dark' ? 'light' : 'dark')
  return { tema, alternar }
}

/** Aplica o tema escolhido enquanto o componente estiver montado. */
export function useAplicarTema() {
  const { tema } = useTema()
  useEffect(() => {
    const html = document.documentElement
    if (tema === 'light') html.setAttribute('data-theme', 'light')
    else html.removeAttribute('data-theme')
    return () => html.removeAttribute('data-theme')
  }, [tema])
}
