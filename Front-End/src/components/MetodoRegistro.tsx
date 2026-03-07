interface MetodoRegistroProps {
  onTirarFoto?: () => void;
  onDigitarManual?: () => void;
  onBack: () => void;
}

export default function MetodoRegistro({ onBack, onTirarFoto, onDigitarManual }: MetodoRegistroProps) {
  return (
    <div className="screen docspend-screen">
      {/* Orange Header */}
      <header className="orange-header">
        <button className="back-btn" onClick={onBack} aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="profile-header-title">Documentos</span>
      </header>

      {/* Peek of previous screen */}
      <div className="docspend-peek">
        <div className="docsm-section-label">DOCUMENTOS DO MOTORISTA</div>
        <div className="docspend-peek-valid">
          <span className="docspend-peek-status">VÁLIDO</span>
        </div>
        <div className="docspend-peek-divider" />
      </div>

      {/* Modal Card */}
      <div className="docspend-body">
        <div className="abast-card">
          <h2 className="abast-title">Método de Registro</h2>
          <p className="abast-subtitle">Selecione uma opção para continuar</p>

          <div className="docspend-grid">
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

            {/* Tirar foto */}
            <button className="abast-option-btn" onClick={onTirarFoto}>
              <div className="abast-option-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <span className="abast-option-label">Tirar foto</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
