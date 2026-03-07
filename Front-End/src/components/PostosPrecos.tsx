import { useState } from 'react';

interface PostosPrecosProps {
  onBack: () => void;
}

const postos = [
  {
    id: 1,
    nome: 'Posto Shell - Km 45',
    logoColor: '#FF6B00',
    logoText: 'S',
    isShell: true,
    parceiro: true,
    rating: 4.8,
    reviews: 128,
    distancia: '2.5 km',
    icons: ['garfo', 'P', 'balanca'],
    s10: '5,89',
    s500: '5,75',
    arla: '3,20',
    atualizado: '25/02/2026 13:35',
  },
  {
    id: 2,
    nome: 'Posto Trevão',
    logoColor: '#3B82F6',
    logoText: 'I',
    isShell: false,
    parceiro: false,
    rating: 4.7,
    reviews: 154,
    distancia: '8.0 km',
    icons: ['garfo', 'balanca'],
    s10: '5,82',
    s500: '5,68',
    arla: '3,15',
    atualizado: '25/02/2026 15:30',
  },
  {
    id: 3,
    nome: 'Posto Estradão',
    logoColor: '#16A34A',
    logoText: 'BR',
    isShell: false,
    parceiro: false,
    rating: 3.9,
    reviews: 82,
    distancia: '12 km',
    icons: ['garfo', 'P'],
    s10: '5,90',
    s500: '5,78',
    arla: '3,25',
    atualizado: '25/02/2026 15:30',
  },
];

function NaRotaView() {
  const [selectedRoute, setSelectedRoute] = useState(0);

  const routes = [
    { id: 0, name: 'Via BR-116', desc: 'Rápido • Menos curvas', km: 408, pedagio: 'R$60', destaque: true },
    { id: 1, name: 'Via BR-101', desc: 'Pista local', km: 455, pedagio: 'R$52', destaque: false },
  ];

  return (
    <div className="naRota-wrap">
      <h2 className="naRota-title">Buscar por postos</h2>
      <p className="naRota-subtitle">Defina o trajeto para procurar por postos</p>

      {/* Route Definition */}
      <div className="naRota-section">
        <div className="naRota-section-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
          DEFINIR ROTA
        </div>

        <div className="naRota-input-group">
          <div className="naRota-input-row">
            <div className="naRota-dot naRota-dot-origin" />
            <input className="naRota-input" type="text" defaultValue="São Paulo, SP" />
          </div>
          <div className="naRota-line-connector" />
          <div className="naRota-input-row">
            <div className="naRota-dot naRota-dot-dest" />
            <input className="naRota-input" type="text" defaultValue="Curitiba, PR" />
          </div>
        </div>
      </div>

      {/* Available Routes */}
      <div className="naRota-section">
        <div className="naRota-routes-header">
          <span className="naRota-section-label" style={{ border: 'none', padding: 0 }}>ROTAS DISPONÍVEIS</span>
          <span className="naRota-routes-count">2 opções</span>
        </div>

        {routes.map(route => (
          <div
            key={route.id}
            className={`naRota-route-card${selectedRoute === route.id ? ' naRota-route-selected' : ''}`}
            onClick={() => setSelectedRoute(route.id)}
          >
            <div className="naRota-route-top">
              <div>
                <div className="naRota-route-name">{route.name}</div>
                <div className="naRota-route-desc">{route.desc}</div>
              </div>
              <div className={`naRota-route-radio${selectedRoute === route.id ? ' naRota-route-radio-active' : ''}`}>
                {selectedRoute === route.id && <div className="naRota-route-radio-inner" />}
              </div>
            </div>
            <div className="naRota-route-stats">
              <div className="naRota-route-stat">
                <span className="naRota-route-stat-label">KM</span>
                <span className="naRota-route-stat-value">{route.km}</span>
              </div>
              <div className={`naRota-route-stat naRota-route-stat-pedagio${selectedRoute === route.id ? ' naRota-route-stat-pedagio-active' : ''}`}>
                <span className="naRota-route-stat-label">PEDÁGIO</span>
                <span className="naRota-route-stat-value">{route.pedagio}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="naRota-buscar-btn">BUSCAR</button>
    </div>
  );
}

export default function PostosPrecos({ onBack }: PostosPrecosProps) {
  const [activeFilter, setActiveFilter] = useState('Todos');
  const filters = ['Todos', 'Na Rota', 'Preço', 'Distância'];

  return (
    <div className="screen postos-screen">
      <header className="orange-header">
        <button className="back-btn" onClick={onBack} aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="profile-header-title">Postos e Preços</span>
      </header>

      <div className="postos-filters">
        {filters.map(f => (
          <button
            key={f}
            className={`postos-filter-btn${activeFilter === f ? ' postos-filter-active' : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {activeFilter === 'Na Rota' ? (
        <div className="postos-body">
          <NaRotaView />
        </div>
      ) : (
        <div className="postos-body">
          <div className="postos-results-label">PRIMEIROS 15 RESULTADOS</div>
          {postos.map(posto => (
            <div key={posto.id} className="posto-card">
              <div className="posto-card-header">
                <div className="posto-logo" style={{ background: posto.isShell ? '#FF6B00' : posto.logoColor }}>
                  <span className="posto-logo-text">{posto.logoText}</span>
                </div>
                <div className="posto-info">
                  <div className="posto-name-row">
                    <span className="posto-name">{posto.nome}</span>
                    {posto.parceiro && <span className="posto-parceiro-badge">PARCEIRO</span>}
                  </div>
                  <div className="posto-rating-row">
                    <span className="posto-star">★</span>
                    <span className="posto-rating-val">{posto.rating}</span>
                    <span className="posto-reviews">({posto.reviews} reviews)</span>
                  </div>
                </div>
                <span className="posto-distancia">{posto.distancia}</span>
              </div>

              <div className="posto-amenities">
                {posto.icons.includes('garfo') && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>
                )}
                {posto.icons.includes('P') && <div className="posto-amenity-p">P</div>}
                {posto.icons.includes('balanca') && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L4.5 20h15L12 3z"/><line x1="4.5" y1="20" x2="19.5" y2="20"/></svg>
                )}
              </div>

              <div className="posto-prices">
                <div className="posto-price-col">
                  <span className="posto-price-label">S10</span>
                  <span className="posto-price-value">{posto.s10}</span>
                </div>
                <div className="posto-price-divider" />
                <div className="posto-price-col">
                  <span className="posto-price-label">S500</span>
                  <span className="posto-price-value">{posto.s500}</span>
                </div>
                <div className="posto-price-divider" />
                <div className="posto-price-col">
                  <span className="posto-price-label">ARLA</span>
                  <span className="posto-price-value">{posto.arla}</span>
                </div>
              </div>

              <div className="posto-updated">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                <span>ATUALIZADO {posto.atualizado}</span>
              </div>

              <button className="posto-map-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                VER NO MAPA
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
