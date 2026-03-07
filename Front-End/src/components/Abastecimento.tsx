interface AbastecimentoProps {
  onBack: () => void;
  onProfile?: () => void;
  onDigitarManual?: () => void;
}

export default function Abastecimento({ onBack, onProfile, onDigitarManual }: AbastecimentoProps) {
  return (
    <div className="screen abast-screen">
      {/* Same Dashboard Header */}
      <header className="dashboard-header">
        <button className="dash-menu-btn" aria-label="Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <img src="/RB.jpg" alt="RB" className="header-logo-rb-img" />
        <button className="dash-avatar-btn" onClick={onProfile} aria-label="Perfil">
          <span className="dash-avatar-letter">A</span>
        </button>
      </header>

      {/* Alert Banner */}
      <div className="abast-alert-wrap">
        <div className="dash-alert">
          <div className="dash-alert-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19H3.5L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
            </svg>
          </div>
          <div className="dash-alert-text">
            <span className="dash-alert-label">ALERTA</span>
            <span className="dash-alert-msg">Sua CNH vence em 15 dias</span>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {/* Modal Card */}
      <div className="abast-body">
        <div className="abast-card">
          <h2 className="abast-title">Como deseja registrar?</h2>
          <p className="abast-subtitle">Selecione uma opção para continuar</p>

          <div className="abast-options">
            {/* Digitar Manual */}
            <button className="abast-option-btn" onClick={onDigitarManual}>
              <div className="abast-option-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  <line x1="3" y1="12" x2="7" y2="12"/>
                  <line x1="3" y1="16" x2="6" y2="16"/>
                  <line x1="3" y1="8" x2="5" y2="8"/>
                </svg>
              </div>
              <span className="abast-option-label">Digitar Manual</span>
            </button>

            {/* Foto da Nota */}
            <button className="abast-option-btn">
              <div className="abast-option-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M7 7h4M7 11h6M7 15h3"/>
                  <rect x="14" y="11" width="5" height="4" rx="1"/>
                </svg>
              </div>
              <span className="abast-option-label">Foto da Nota</span>
            </button>

            {/* Foto da Bomba */}
            <button className="abast-option-btn">
              <div className="abast-option-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 22V6a2 2 0 012-2h8a2 2 0 012 2v16"/>
                  <path d="M3 11h12"/>
                  <path d="M17 6l3 3-3 3"/>
                  <path d="M20 9v6a2 2 0 01-2 2h-1"/>
                </svg>
              </div>
              <span className="abast-option-label">Foto da Bomba</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
