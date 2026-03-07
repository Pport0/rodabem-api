interface SignupProps {
  onBack: () => void;
}

export default function Signup({ onBack }: SignupProps) {
  return (
    <div className="screen signup-screen">
      {/* Orange Header */}
      <header className="orange-header">
        <button className="back-btn" onClick={onBack} aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <img src="/RB.jpg" alt="RB" className="header-logo-rb-img" />
      </header>

      {/* Body */}
      <div className="signup-body">
        <h1 className="signup-title">CRIAR CONTA</h1>
        <p className="signup-subtitle">Informe os seus dados pessoais</p>

        <div className="form-group">
          <label className="form-label">
            NOME COMPLETO<span className="required">*</span>
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="Digite aqui o seu nome completo"
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            CPF<span className="required">*</span>
          </label>
          <input
            type="text"
            className="form-input"
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
            className="form-input"
            placeholder="(00) 00000-0000"
            maxLength={15}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            SENHA DE ACESSO<span className="required">*</span>
          </label>
          <input
            type="password"
            className="form-input"
            placeholder="Digite uma senha"
          />
          <p className="form-hint">
            *Pode conter letras, números e símbolos<br />
            *Mínimo de 6 caracteres
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">
            CONFIRME SUA SENHA<span className="required">*</span>
          </label>
          <input
            type="password"
            className="form-input"
            placeholder="Confirme a sua senha"
          />
        </div>

        <div className="signup-footer">
          <button className="btn-primary-arrow">
            CONTINUAR
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
