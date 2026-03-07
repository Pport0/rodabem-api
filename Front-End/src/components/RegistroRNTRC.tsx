import { useState } from 'react';

interface RegistroRNTRCProps {
  onBack: () => void;
}

const categorias = ['TAC', 'ETC', 'CTC'];

export default function RegistroRNTRC({ onBack }: RegistroRNTRCProps) {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  return (
    <div className="screen regcnh-screen">
      <header className="orange-header">
        <button className="back-btn" onClick={onBack} aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="profile-header-title">REGISTRO RNTRC</span>
      </header>

      <div className="regcnh-body">

        <div className="form-group">
          <label className="form-label">
            NÚMERO DE REGISTRO<span className="required">*</span>
          </label>
          <input
            type="text"
            className="form-input regcnh-input regcnh-input-focused"
            placeholder="00000000000"
            maxLength={11}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            DATA DE VALIDADE<span className="required">*</span>
          </label>
          <div className="regcnh-date-wrap">
            <input
              type="text"
              className="form-input regcnh-input"
              placeholder="00/00/0000"
              maxLength={10}
            />
            <button className="regcnh-calendar-btn" aria-label="Calendário">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            CATEGORIA<span className="required">*</span>
          </label>
          <div className="regcnh-cats regcnh-cats-3">
            {categorias.map(cat => (
              <button
                key={cat}
                className={`regcnh-cat-btn${selectedCat === cat ? ' regcnh-cat-active' : ''}`}
                onClick={() => setSelectedCat(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

      </div>

      <div className="docsm-footer">
        <button className="btn-primary docsm-add-btn">Registrar documento</button>
      </div>
    </div>
  );
}
