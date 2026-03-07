interface DocumentosVeiculoProps {
  onBack: () => void;
}

const docs = [
  {
    id: 1,
    status: 'VÁLIDO',
    statusColor: '#16A34A',
    borderColor: '#16A34A',
    name: 'CRLV Digital',
    detail: 'Vencimento: 31/12/2024',
    badge: null,
    badgeType: 'eye',
  },
  {
    id: 2,
    status: 'PAGO',
    statusColor: '#3B82F6',
    borderColor: '#3B82F6',
    name: 'IPVA 2024',
    detail: null,
    badge: 'JÁ PAGO',
    badgeType: 'paid',
  },
  {
    id: 3,
    status: 'EXPIRADO',
    statusColor: '#DC2626',
    borderColor: '#DC2626',
    name: 'Inspeção Técnica',
    detail: 'Expirou em: 01/08/2024',
    badge: null,
    badgeType: 'warning',
  },
  {
    id: 4,
    status: 'PENDENTE',
    statusColor: '#F59E0B',
    borderColor: '#F59E0B',
    name: 'SEGURO\n02/2024',
    detail: null,
    badge: 'REGISTRAR',
    badgeType: 'register',
  },
];

export default function DocumentosVeiculo({ onBack }: DocumentosVeiculoProps) {
  return (
    <div className="screen docsm-screen">
      <header className="orange-header">
        <button className="back-btn" onClick={onBack} aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="profile-header-title">Documentos</span>
      </header>

      <div className="docsm-body">
        <div className="docsm-section-label">DOCUMENTOS DO VEÍCULO</div>

        <div className="docsm-list">
          {docs.map(doc => (
            <div key={doc.id} className="docsv-card" style={{ borderLeftColor: doc.borderColor }}>
              <div className="docsm-card-left">
                <span className="docsm-status" style={{ color: doc.statusColor }}>{doc.status}</span>
                <span className="docsv-name">{doc.name}</span>
                {doc.detail && <span className="docsm-detail">{doc.detail}</span>}
              </div>

              <div className="docsv-action">
                {doc.badgeType === 'eye' && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E8500A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
                {doc.badgeType === 'paid' && (
                  <span className="docsv-badge docsv-badge-paid">{doc.badge}</span>
                )}
                {doc.badgeType === 'warning' && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                )}
                {doc.badgeType === 'register' && (
                  <span className="docsv-badge docsv-badge-register">{doc.badge}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="docsm-footer">
        <button className="btn-primary docsm-add-btn">Adicionar documento</button>
      </div>
    </div>
  );
}
