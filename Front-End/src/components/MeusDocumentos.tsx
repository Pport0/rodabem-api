interface MeusDocumentosProps {
  onBack: () => void;
  onProfile?: () => void;
  onMotorista?: () => void;
  onVeiculo?: () => void;
}

export default function MeusDocumentos({ onBack, onProfile, onMotorista, onVeiculo }: MeusDocumentosProps) {
  return (
    <div className="screen meudoc-screen">
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

      {/* Dashboard summary peek */}
      <div className="meudoc-dash-peek">
        <div className="dash-section-label">RESUMO DO MÊS</div>
        <div className="meudoc-peek-row">
          <div className="meudoc-peek-item">
            <span className="meudoc-peek-label">MÉDIA DE CONSUMO</span>
          </div>
          <div className="meudoc-peek-item">
            <span className="meudoc-peek-label">GASTOS TOTAIS</span>
          </div>
        </div>
      </div>

      {/* Modal Card */}
      <div className="meudoc-body">
        <div className="abast-card">
          <h2 className="abast-title">Visualizar documentos</h2>
          <p className="abast-subtitle">Selecione uma opção para continuar</p>

          <div className="meudoc-options">
            {/* Motorista */}
            <button className="abast-option-btn" onClick={onMotorista}>
              <div className="abast-option-icon">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
                </svg>
              </div>
              <span className="abast-option-label">Motorista</span>
            </button>

            {/* Veículo */}
            <button className="abast-option-btn" onClick={onVeiculo}>
              <div className="abast-option-icon">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="8" width="22" height="10" rx="2"/>
                  <path d="M5 8V6a2 2 0 012-2h10a2 2 0 012 2v2"/>
                  <circle cx="6" cy="18" r="2"/>
                  <circle cx="18" cy="18" r="2"/>
                  <path d="M1 13h22"/>
                </svg>
              </div>
              <span className="abast-option-label">Veículo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
