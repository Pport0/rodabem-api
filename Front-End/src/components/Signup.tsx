import { useState } from 'react';
import { apiCreateUser } from '../api';

interface SignupProps {
  onBack: () => void;
  onSuccess?: () => void;
}

export default function Signup({ onBack, onSuccess }: SignupProps) {
  const [form, setForm] = useState({ nome: '', cpf: '', telefone: '', email: '', senha: '', confirmarSenha: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const formatCpf = (value: string) => {
    const d = value.replace(/\D/g, '').slice(0, 11);
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  };

  const formatPhone = (value: string) => {
    const d = value.replace(/\D/g, '').slice(0, 11);
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.nome || !form.cpf || !form.telefone || !form.email || !form.senha) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (form.senha !== form.confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }
    if (form.senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await apiCreateUser({
        nome: form.nome,
        cpf: form.cpf.replace(/\D/g, ''),
        email: form.email,
        senha: form.senha,
        telefone: form.telefone.replace(/\D/g, ''),
      });
      setSuccess(true);
      setTimeout(() => onSuccess?.() || onBack(), 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen signup-screen">
      <header className="orange-header">
        <button className="back-btn" onClick={onBack} aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <img src="/RB.jpg" alt="RB" className="header-logo-rb-img" />
      </header>

      <div className="signup-body">
        <h1 className="signup-title">CRIAR CONTA</h1>
        <p className="signup-subtitle">Informe os seus dados pessoais</p>

        {error && <div className="api-error">{error}</div>}
        {success && <div className="api-success">Conta criada com sucesso!</div>}

        <div className="form-group">
          <label className="form-label">NOME COMPLETO<span className="required">*</span></label>
          <input type="text" className="form-input" placeholder="Digite aqui o seu nome completo" value={form.nome} onChange={set('nome')} />
        </div>

        <div className="form-group">
          <label className="form-label">E-MAIL<span className="required">*</span></label>
          <input type="email" className="form-input" placeholder="seu@email.com" value={form.email} onChange={set('email')} />
        </div>

        <div className="form-group">
          <label className="form-label">CPF<span className="required">*</span></label>
          <input type="text" className="form-input" placeholder="000.000.000-00" maxLength={14}
            value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: formatCpf(e.target.value) }))} />
        </div>

        <div className="form-group">
          <label className="form-label">TELEFONE<span className="required">*</span></label>
          <input type="tel" className="form-input" placeholder="(00) 00000-0000" maxLength={15}
            value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: formatPhone(e.target.value) }))} />
        </div>

        <div className="form-group">
          <label className="form-label">SENHA DE ACESSO<span className="required">*</span></label>
          <input type="password" className="form-input" placeholder="Digite uma senha" value={form.senha} onChange={set('senha')} />
          <p className="form-hint">*Mínimo de 6 caracteres</p>
        </div>

        <div className="form-group">
          <label className="form-label">CONFIRME SUA SENHA<span className="required">*</span></label>
          <input type="password" className="form-input" placeholder="Confirme a sua senha" value={form.confirmarSenha} onChange={set('confirmarSenha')} />
        </div>

        <div className="signup-footer">
          <button className="btn-primary-arrow" onClick={handleSubmit} disabled={loading}>
            {loading ? 'AGUARDE...' : 'CONTINUAR'}
            {!loading && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
