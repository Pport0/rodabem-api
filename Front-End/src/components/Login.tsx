import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { apiLogin } from '../api';

interface LoginProps {
  onBack: () => void;
  onForgotPassword: () => void;
  onLogin?: () => void;
}

export default function Login({ onBack, onForgotPassword, onLogin }: LoginProps) {
  const { login } = useAuth();
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  };

  const handleLogin = async () => {
    setError('');
    const rawCpf = cpf.replace(/\D/g, '');
    if (!rawCpf || !senha) {
      setError('Preencha CPF e senha.');
      return;
    }
    setLoading(true);
    try {
      const data = await apiLogin(rawCpf, senha);
      login(data.user, data.access_token);
      onLogin?.();
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen login-screen">
      <header className="orange-header">
        <button className="back-btn" onClick={onBack} aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <img src="/RB.jpg" alt="RB" className="header-logo-rb-img" />
      </header>

      <div className="login-body">
        <div className="login-title-wrap">
          <img src="/ENTRAR.jpg" alt="ENTRAR - Insira as suas credenciais para acessar" className="login-title-img" />
        </div>

        {error && <div className="api-error">{error}</div>}

        <div className="login-fields">
          <div className="form-group">
            <label className="form-label">CPF</label>
            <input
              type="text"
              className="form-input"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={e => setCpf(formatCpf(e.target.value))}
              maxLength={14}
            />
          </div>
          <div className="form-group">
            <label className="form-label">SENHA</label>
            <input
              type="password"
              className="form-input"
              placeholder="Sua senha"
              value={senha}
              onChange={e => setSenha(e.target.value)}
            />
          </div>
        </div>

        <div className="login-spacer" />

        <div className="login-actions">
          <button
            className="btn-primary login-btn-acessar"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'ENTRANDO...' : 'ACESSAR'}
          </button>
        </div>

        <div className="login-bottom-row">
          <span className="login-forgot" onClick={onForgotPassword}>
            ESQUECI MINHA SENHA
          </span>
        </div>
      </div>
    </div>
  );
}
