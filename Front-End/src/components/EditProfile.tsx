interface EditProfileProps {
  onBack: () => void;
}

export default function EditProfile({ onBack }: EditProfileProps) {
  return (
    <div className="screen editprofile-screen">
      {/* Orange Header */}
      <header className="orange-header">
        <button className="back-btn" onClick={onBack} aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="profile-header-title">PERFIL</span>
      </header>

      <div className="editprofile-body">

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
          <button className="profile-edit-btn">Editar Perfil</button>
        </div>

        {/* Form */}
        <div className="editprofile-form">
          <div className="editprofile-section-label">MEUS DADOS</div>

          <div className="form-group">
            <label className="form-label">
              NOME COMPLETO<span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input editprofile-input"
              placeholder="Digite aqui o seu nome completo"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              CPF<span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input editprofile-input"
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              TELEFONE<span className="required">*</span>
            </label>
            <input
              type="tel"
              className="form-input editprofile-input"
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

      </div>

      {/* Fixed bottom button */}
      <div className="editprofile-footer">
        <button className="btn-primary editprofile-save-btn" onClick={onBack}>
          SALVAR ALTERAÇÕES
        </button>
      </div>
    </div>
  );
}
