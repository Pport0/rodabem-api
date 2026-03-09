import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { apiUpdateUser } from '../api';

interface EditProfileProps {
  onBack: () => void;
}

export default function EditProfile({ onBack }: EditProfileProps) {
  const { user, updateUser } = useAuth();
  const [nome, setNome] = useState(user?.nome || '');
  const [email, setEmail] = useState(user?.email || '');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setError('');
    if (!nome) { setError('O nome é obrigatório.'); return; }
    if (!user?.id) return;
    setLoading(true);
    try {
      await apiUpdateUser(user.id, { nome, email, ...(telefone ? { telefone } : {}) });
      updateUser({ nome, email });
      setSuccess(true);
      setTimeout(() => onBack(), 1200);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar alterações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen editprofile-screen">
      <header className="orange-header">
        <button className="back-btn" onClick={onBack} aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="profile-header-title">PERFIL</span>
      </header>

      <div className="editprofile-body">
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
          <h2 className="profile-name">{user?.nome || 'Usuário'}</h2>
          <span className="profile-level">MOTORISTA NÍVEL 5</span>
          <button className="profile-edit-btn">Editar Perfil</button>
        </div>

        <div className="editprofile-form">
          <div className="editprofile-section-label">MEUS DADOS</div>

          {error && <div className="api-error">{error}</div>}
          {success && <div className="api-success">Salvo com sucesso!</div>}

          <div className="form-group">
            <label className="form-label">NOME COMPLETO<span className="required">*</span></label>
            <input type="text" className="form-input editprofile-input" placeholder="Digite aqui o seu nome completo"
              value={nome} onChange={e => setNome(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">E-MAIL<span className="required">*</span></label>
            <input type="email" className="form-input editprofile-input" placeholder="seu@email.com"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">TELEFONE</label>
            <input type="tel" className="form-input editprofile-input" placeholder="(00) 00000-0000"
              value={telefone} onChange={e => setTelefone(e.target.value)} />
          </div>
        </div>

        <div style={{ flex: 1 }} />
      </div>

      <div className="editprofile-footer">
        <button className="btn-primary editprofile-save-btn" onClick={handleSave} disabled={loading}>
          {loading ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
        </button>
      </div>
    </div>
  );
}
