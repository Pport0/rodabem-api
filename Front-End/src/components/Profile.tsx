interface ProfileProps {
  onBack: () => void;
  onEditProfile?: () => void;
}

export default function Profile({ onBack, onEditProfile }: ProfileProps) {
  return (
    <div className="screen profile-screen">
      {/* Orange Header */}
      <header className="orange-header">
        <button className="back-btn" onClick={onBack} aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="profile-header-title">PERFIL</span>
      </header>

      <div className="profile-body">

        {/* Avatar + Name */}
        <div className="profile-hero">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar-circle">
              <svg viewBox="0 0 80 80" width="80" height="80">
                <circle cx="40" cy="40" r="40" fill="#5B8FA8"/>
                <circle cx="40" cy="30" r="14" fill="#3a6b82"/>
                <ellipse cx="40" cy="68" rx="24" ry="18" fill="#3a6b82"/>
              </svg>
            </div>
          </div>
          <h2 className="profile-name">João Silva</h2>
          <span className="profile-level">MOTORISTA NÍVEL 5</span>
          <button className="profile-edit-btn" onClick={onEditProfile}>Editar Perfil</button>
        </div>

        {/* Meus Dados */}
        <div className="profile-section-label">MEUS DADOS</div>
        <div className="profile-card">
          <div className="profile-row">
            <span className="profile-row-label">Nome</span>
            <span className="profile-row-value">João da Silva Santos</span>
          </div>
          <div className="profile-row-divider" />
          <div className="profile-row">
            <span className="profile-row-label">CPF</span>
            <span className="profile-row-value">123.456.789-00</span>
          </div>
          <div className="profile-row-divider" />
          <div className="profile-row">
            <span className="profile-row-label">TELEFONE</span>
            <span className="profile-row-value">+556299999-9999</span>
          </div>
        </div>

        {/* Meu Caminhão */}
        <div className="profile-section-label">MEU CAMINHÃO</div>
        <div className="profile-card">
          <div className="profile-row">
            <span className="profile-row-label">Placa</span>
            <span className="profile-plate">ABC-1D23</span>
          </div>
          <div className="profile-row-divider" />
          <div className="profile-row">
            <span className="profile-row-label">Modelo</span>
            <span className="profile-row-value">Volvo FH 540 Globetrotter</span>
          </div>
          <div className="profile-row-divider" />
          <div className="profile-row">
            <span className="profile-row-label">Eixos</span>
            <span className="profile-row-value">6 Eixos (Bitrem)</span>
          </div>
        </div>

      </div>
    </div>
  );
}
