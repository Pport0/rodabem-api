interface LoginProps {
  onBack: () => void;
  onForgotPassword: () => void;
  onLogin?: () => void;
}

export default function Login({ onBack, onForgotPassword, onLogin }: LoginProps) {
  return (
    <div className="screen login-screen">
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
      <div className="login-body">
        {/* Title image */}
        <div className="login-title-wrap">
          <img src="/ENTRAR.jpg" alt="ENTRAR - Insira as suas credenciais para acessar" className="login-title-img" />
        </div>

        {/* Fields */}
        <div className="login-fields">
          <div className="form-group">
            <label className="form-label">CPF</label>
            <input
              type="text"
              className="form-input"
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>

          <div className="form-group">
            <label className="form-label">SENHA</label>
            <input
              type="password"
              className="form-input"
              placeholder="Sua senha"
            />
          </div>
        </div>

        {/* Spacer pushes button down */}
        <div className="login-spacer" />

        {/* ACESSAR button */}
        <div className="login-actions">
          <button className="btn-primary login-btn-acessar" onClick={onLogin}>ACESSAR</button>
        </div>

        {/* Forgot password row */}
        <div className="login-bottom-row">
          <span className="login-forgot" onClick={onForgotPassword}>
            ESQUECI MINHA SENHA
          </span>
        </div>
      </div>
    </div>
  );
}
