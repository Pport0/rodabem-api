interface DocumentosMotoristaProps {
  onAdicionar?: () => void;
  onBack: () => void;
}

const docs = [
  {
    id: 1,
    status: 'VÁLIDO',
    statusColor: '#16A34A',
    name: 'CNH',
    detail: 'Vencimento: 31/12/2024',
    icon: 'eye',
    iconColor: '#E8500A',
  },
  {
    id: 2,
    status: 'VENCENDO EM BREVE',
    statusColor: '#F59E0B',
    name: 'Curso MOPP',
    detail: 'Vencimento: 15/10/2024',
    icon: 'eye',
    iconColor: '#E8500A',
  },
  {
    id: 3,
    status: 'EXPIRADO',
    statusColor: '#DC2626',
    name: 'RNTRC',
    detail: 'Expirou em: 01/08/2024',
    icon: 'warning',
    iconColor: '#F59E0B',
  },
];

export default function DocumentosMotorista({ onBack, onAdicionar }: DocumentosMotoristaProps) {
  return (
    <div className="screen docsm-screen">
      {/* Orange Header */}
      <header className="orange-header">
        <button className="back-btn" onClick={onBack} aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="profile-header-title">Documentos</span>
      </header>

      <div className="docsm-body">
        <div className="docsm-section-label">DOCUMENTOS DO MOTORISTA</div>

        <div className="docsm-list">
          {docs.map(doc => (
            <div key={doc.id} className="docsm-card">
              <div className="docsm-card-left">
                <span className="docsm-status" style={{ color: doc.statusColor }}>{doc.status}</span>
                <span className="docsm-name">{doc.name}</span>
                <span className="docsm-detail">{doc.detail}</span>
              </div>
              <div className="docsm-card-icon">
                {doc.icon === 'eye' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={doc.iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={doc.iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Button */}
      <div className="docsm-footer">
        <button className="btn-primary docsm-add-btn" onClick={onAdicionar}>Adicionar documento</button>
      </div>
    </div>
  );
}
