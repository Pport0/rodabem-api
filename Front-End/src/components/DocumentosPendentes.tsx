interface DocumentosPendentesProps {
  onSelectDoc?: (doc: string) => void;
  onBack: () => void;
}

const pendentes = [
  {
    id: 1,
    name: 'CNH',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E8500A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id: 2,
    name: 'Curso MOPP',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E8500A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
  {
    id: 3,
    name: 'RNTRC',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E8500A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="8" width="22" height="10" rx="2"/>
        <path d="M5 8V6a2 2 0 012-2h10a2 2 0 012 2v2"/>
        <circle cx="6" cy="18" r="2"/>
        <circle cx="18" cy="18" r="2"/>
        <path d="M1 13h22"/>
      </svg>
    ),
  },
];

export default function DocumentosPendentes({ onBack, onSelectDoc }: DocumentosPendentesProps) {
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
          <h2 className="abast-title">Documentos pendentes</h2>
          <p className="abast-subtitle">Selecione uma opção para continuar</p>

          <div className="docspend-grid">
            {pendentes.map(doc => (
              <button key={doc.id} className="abast-option-btn" onClick={() => onSelectDoc && onSelectDoc(doc.name)}>
                <div className="abast-option-icon">
                  {doc.icon}
                </div>
                <span className="abast-option-label">{doc.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
