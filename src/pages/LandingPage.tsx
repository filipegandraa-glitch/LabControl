import { useEffect } from 'react'
import styles from './LandingPage.module.css'

// Landing do Lab Control, no mesmo padrão da landing do DFC Scale.

interface LandingPageProps {
  onEntrar: () => void
}

const DESTAQUES = [
  { valor: 'Kanban', legenda: 'do pré-envio à instalação' },
  { valor: 'Calendário', legenda: 'prazos e agendamento do paciente' },
  { valor: 'Pagamentos', legenda: 'valor e status de cada trabalho' },
]

export default function LandingPage({ onEntrar }: LandingPageProps) {
  useEffect(() => {
    const anterior = document.title
    document.title = 'Lab Control: os trabalhos de laboratório da sua clínica'
    return () => { document.title = anterior }
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.topo}>
        <a href="/" className={styles.marca} aria-label="Lab Control, início">
          <img src="/symbol-gold.svg" alt="" className={styles.simbolo} />
          <span>Lab <strong>Control</strong></span>
        </a>
        <button type="button" className={styles.btnTopo} onClick={onEntrar}>
          Entrar
        </button>
      </header>

      <main className={styles.hero}>
        <p className={styles.eyebrow}>Acesso exclusivo · Alunos da mentoria</p>
        <h1 className={styles.titulo}>
          Cada trabalho de laboratório,<br />sem perder prazo.
        </h1>
        <p className={styles.texto}>
          Registre o envio ao laboratório, acompanhe cada etapa até a instalação no paciente
          e veja num só lugar os prazos, os laboratórios e os pagamentos de cada trabalho.
        </p>

        <button type="button" className={styles.cta} onClick={onEntrar}>
          Entrar na ferramenta
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
        <p className={styles.nota}>Seu acesso é criado por nós.</p>

        <ul className={styles.destaques}>
          {DESTAQUES.map(d => (
            <li key={d.valor} className={styles.destaque}>
              <span className={styles.destaqueValor}>{d.valor}</span>
              <span className={styles.destaqueLegenda}>{d.legenda}</span>
            </li>
          ))}
        </ul>
      </main>

      <footer className={styles.rodape}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 2l8.66 5v10L12 22l-8.66-5V7z" />
          <path d="M8.5 12.5l2.5 2.5 4.5-5" />
        </svg>
        Método ClinicScale
      </footer>
    </div>
  )
}
