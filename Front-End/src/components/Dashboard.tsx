interface DashboardProps {
  onLogout?: () => void;
  onProfile?: () => void;
  onPostos?: () => void;
  onAbastecimento?: () => void;
  onDocumentos?: () => void;
}

export default function Dashboard({ onLogout, onProfile, onPostos, onAbastecimento, onDocumentos }: DashboardProps) {
  return (
    <div className="screen dashboard-screen">
      {/* Orange Header */}
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

      {/* Scrollable Body */}
      <div className="dashboard-body">

        {/* Alert Banner */}
        <div className="dash-alert">
          <div className="dash-alert-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="0">
              <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19H3.5L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" fill="white"/>
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

        {/* Resumo do Mês */}
        <div className="dash-section-label">RESUMO DO MÊS</div>
        <div className="dash-resumo">
          <div className="dash-resumo-item">
            <span className="dash-resumo-title">MÉDIA DE CONSUMO</span>
            <div className="dash-resumo-value">
              <span className="dash-resumo-big">2,8</span>
              <span className="dash-resumo-unit">KM/L</span>
            </div>
          </div>
          <div className="dash-resumo-divider" />
          <div className="dash-resumo-item">
            <span className="dash-resumo-title">GASTOS TOTAIS</span>
            <div className="dash-resumo-value">
              <span className="dash-resumo-currency">R$</span>
              <span className="dash-resumo-big">4.250</span>
            </div>
          </div>
        </div>

        {/* Menu Cards */}
        <div className="dash-cards">

          {/* ABASTECIMENTO - orange */}
          <div className="dash-card dash-card-orange" onClick={onAbastecimento}>
            <div className="dash-card-text">
              <span className="dash-card-title">ABASTECIMENTO</span>
              <span className="dash-card-subtitle">Informe litros e valor do diesel</span>
            </div>
            <div className="dash-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 22V6a2 2 0 012-2h8a2 2 0 012 2v16"/>
                <path d="M3 11h12"/>
                <path d="M17 6l3 3-3 3"/>
                <path d="M20 9v6a2 2 0 01-2 2h-1"/>
              </svg>
            </div>
          </div>

          {/* POSTOS E PREÇOS - dark */}
          <div className="dash-card dash-card-dark" onClick={onPostos}>
            <div className="dash-card-text">
              <span className="dash-card-title">POSTOS E PREÇOS</span>
              <span className="dash-card-subtitle">Encontre diesel no seu caminho</span>
            </div>
            <div className="dash-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
            </div>
          </div>

          {/* MEUS DOCUMENTOS - medium dark */}
          <div className="dash-card dash-card-medium" onClick={onDocumentos}>
            <div className="dash-card-text">
              <span className="dash-card-title">MEUS DOCUMENTOS</span>
              <span className="dash-card-subtitle">Acesse CRLv, CNH e outros</span>
            </div>
            <div className="dash-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
          </div>

          {/* CALCULAR FRETE - white */}
          <div className="dash-card dash-card-white">
            <div className="dash-card-text">
              <span className="dash-card-title dash-card-title-dark">CALCULAR FRETE</span>
              <span className="dash-card-subtitle dash-card-subtitle-dark">Calcule lucro e gastos da viagem</span>
            </div>
            <div className="dash-card-icon dash-card-icon-dark">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <line x1="8" y1="14" x2="8" y2="14"/>
                <line x1="12" y1="14" x2="12" y2="14"/>
                <line x1="16" y1="14" x2="16" y2="14"/>
              </svg>
            </div>
          </div>

        </div>

        {/* Publicidade */}
        <div className="dash-ad">
          <span className="dash-ad-text">Publicidade</span>
        </div>

        {/* Dots */}
        <div className="dash-dots">
          <span className="dash-dot dash-dot-active" />
          <span className="dash-dot" />
          <span className="dash-dot" />
        </div>

      </div>
    </div>
  );
}
