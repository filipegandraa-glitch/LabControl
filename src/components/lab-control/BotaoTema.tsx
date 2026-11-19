import { useTema } from '../../lib/tema'
import styles from '../../pages/LabControlPage.module.css'

const IconeSol = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
)

const IconeLua = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
)

/** Alterna entre modo escuro (padrão) e modo claro. */
export function BotaoTema() {
  const { tema, alternar } = useTema()
  const rotulo = tema === 'dark' ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'
  return (
    <button type="button" className={styles.themeToggle} onClick={alternar} aria-label={rotulo} title={rotulo}>
      {tema === 'dark' ? <IconeSol /> : <IconeLua />}
    </button>
  )
}
