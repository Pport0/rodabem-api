import { useState } from 'react';

interface RegistroManualProps {
  onBack: () => void;
}

export default function RegistroManual({ onBack }: RegistroManualProps) {
  const [preco, setPreco] = useState('');
  const [litros, setLitros] = useState('');
  const [km, setKm] = useState('');

  const valorEstimado = preco && litros
    ? (parseFloat(preco.replace(',', '.')) * parseFloat(litros.replace(',', '.'))).toFixed(2).replace('.', ',')
    : '0,00';

  return (
    <div className="screen registro-screen">
      {/* Orange Header */}
      <header className="orange-header">
        <button className="back-btn" onClick={onBack} aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="profile-header-title">REGISTRO MANUAL</span>
      </header>

      <div className="registro-body">

        {/* Posto Identificado */}
        <div className="registro-card">
          <div className="registro-section-label">POSTO IDENTIFICADO</div>
          <div className="registro-posto-row">
            <div className="registro-posto-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div className="registro-posto-info">
              <span className="registro-posto-name">Ipiranga - Av. Central Norte</span>
              <span className="registro-posto-addr">Rua das Flores, 450 - Central</span>
            </div>
          </div>
        </div>

        {/* Preço / Litro + Total Litros */}
        <div className="registro-card">
          <div className="registro-row-2col">
            <div className="registro-field">
              <label className="registro-label">PREÇO / LITRO<span className="required">*</span></label>
              <div className="registro-input-wrap">
                <span className="registro-prefix">R$</span>
                <input
                  className="registro-input"
                  type="number"
                  placeholder="0,00"
                  value={preco}
                  onChange={e => setPreco(e.target.value)}
                />
              </div>
            </div>
            <div className="registro-field">
              <label className="registro-label">TOTAL LITROS<span className="required">*</span></label>
              <div className="registro-input-wrap">
                <input
                  className="registro-input"
                  type="number"
                  placeholder="0,00"
                  value={litros}
                  onChange={e => setLitros(e.target.value)}
                />
                <span className="registro-suffix">L</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quilometragem Atual */}
        <div className="registro-card">
          <label className="registro-label">QUILOMETRAGEM ATUAL</label>
          <div className="registro-input-wrap registro-km-wrap">
            <input
              className="registro-input registro-km-input"
              type="number"
              placeholder="000.000"
              value={km}
              onChange={e => setKm(e.target.value)}
            />
            <button className="registro-camera-btn" aria-label="Foto">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Valor Estimado */}
        <div className="registro-valor-row">
          <span className="registro-valor-label">Valor Estimado</span>
          <span className="registro-valor-value">R$ {valorEstimado}</span>
        </div>

      </div>

      {/* Bottom Button */}
      <div className="registro-footer">
        <button className="btn-primary registro-confirmar-btn">
          Confirmar Abastecimento
        </button>
      </div>
    </div>
  );
}
