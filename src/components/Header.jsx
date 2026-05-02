import { useState } from 'react';
import { Search, ShoppingCart, MapPin, Phone, Clock, Menu } from 'lucide-react';

export default function Header({ cartItemCount, onOpenCart, searchQuery, setSearchQuery, selectedStore }) {
  const [showHours, setShowHours] = useState(false);
  const [isStoresOpen, setIsStoresOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header style={{ backgroundColor: 'var(--primary-color)', position: 'relative', zIndex: 1000 }}>
      {/* Andar 1: Faixa de Utilidades (Utility Bar) - Escondida no Mobile ou Simplificada */}
      <div className="hide-mobile" style={{ backgroundColor: '#130d0a', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0.4rem 0', fontSize: '0.8rem', color: 'var(--accent-color)' }}>
        <div className="container flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <MapPin size={12} /> 
              {selectedStore ? `Atendido por: ${selectedStore}` : "Campo Grande, MS"}
            </span>
            <span className="flex items-center gap-1"><Phone size={12} /> (67) 3304-5100</span>
          </div>
          <div className="flex items-center gap-4">
            <div 
              style={{ position: 'relative' }}
              onMouseEnter={() => setShowHours(true)}
              onMouseLeave={() => setShowHours(false)}
              onClick={() => setShowHours(!showHours)}
            >
              <button className="flex items-center gap-1 hover:text-white" style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer' }}>
                <Clock size={12} /> Horários
              </button>
              {showHours && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  backgroundColor: '#130d0a',
                  color: 'white',
                  padding: '0.8rem',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  zIndex: 1000,
                  width: 'max-content',
                  marginTop: '10px',
                  border: '1px solid var(--accent-color)',
                  fontSize: '0.85rem',
                  lineHeight: '1.4'
                }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--accent-color)', marginBottom: '4px' }}>Horário de Funcionamento:</div>
                  <div>Seg a Sáb: 07h às 20h</div>
                  <div>Dom: 07:30h às 13h</div>
                  <div style={{ position: 'absolute', top: '-6px', left: '20px', width: '10px', height: '10px', backgroundColor: '#130d0a', borderLeft: '1px solid var(--accent-color)', borderTop: '1px solid var(--accent-color)', transform: 'rotate(45deg)' }}></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Andar 2: Principal (Logo + Busca + Ações) */}
      <div className="container header-main-tier" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1rem', flexWrap: 'wrap', gap: '1rem' }}>

        <div
          onClick={() => window.location.href = '/'}
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <img
            src="/logo.png"
            alt="Arapongas Supermercados"
            style={{ height: 'clamp(60px, 10vw, 110px)', objectFit: 'contain' }}
          />
        </div>

        {/* Busca Responsiva */}
        <div style={{ flex: 1, padding: '0 1rem' }} className="header-search-container">
          <div style={{ position: 'relative', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
            <Search size={22} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '18px', color: 'var(--primary-color)' }} />
            <input
              type="text"
              placeholder="O que você precisa hoje? (Ex: Picanha, Vinho, Maçã...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.9rem 1rem 0.9rem 3.5rem', borderRadius: '8px', border: '1px solid var(--accent-color)', backgroundColor: 'var(--bg-color)', outline: 'none', fontSize: '1rem', color: 'var(--text-main)' }}
            />
          </div>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            className="show-mobile"
            style={{ color: 'var(--bg-color)' }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu size={28} />
          </button>

          <button
            style={{ position: 'relative', color: 'var(--bg-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}
            onClick={onOpenCart}
          >
            <div style={{ position: 'relative' }}>
              <ShoppingCart size={24} />
              {cartItemCount > 0 && (
                <span style={{ position: 'absolute', top: '-8px', right: '-10px', backgroundColor: 'var(--accent-color)', color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {cartItemCount}
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-color)' }} className="hide-mobile">Carrinho</span>
          </button>
        </div>
      </div>

      {/* Andar 3: Navigation - Responsivo */}
      <nav style={{ 
        backgroundColor: 'rgba(0,0,0,0.1)', 
        padding: '0.6rem 0', 
        color: 'var(--bg-color)', 
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: isMobileMenuOpen ? 'block' : 'none' 
      }} className="nav-container-mobile">
        <div className="container nav-grid-layout">
          <div className="mobile-menu-spacer"></div> {/* Spacer para centralização perfeita */}
          <div className="nav-links-wrapper">
            <ul className="nav-links" style={{ display: 'flex', gap: '2rem', listStyle: 'none', margin: 0, padding: 0 }}>
              <li><a href="#" className="nav-btn">Grupo de Ofertas</a></li>
              <li style={{ position: 'relative' }}>
                <button 
                  onClick={() => setIsStoresOpen(!isStoresOpen)}
                  className="nav-btn"
                >
                  Nossas Lojas
                </button>
                {isStoresOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    marginTop: '15px',
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    zIndex: 2000,
                    width: '400px',
                    color: 'var(--text-main)',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                       <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-color)' }}>Nossas Unidades</h3>
                       <button onClick={() => setIsStoresOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                      {[
                        { name: "Arapongas Margarida", address: "R. Navirai, 526 - Vila Margarida", zip: "79023-162" },
                        { name: "Arapongas Santa Fé", address: "R. Abrão Júlio Rahe, 2377", zip: "79021-120" },
                        { name: "Arapongas São Francisco", address: "R. Amazonas, 1101", zip: "79002-280" },
                        { name: "Arapongas Itanhagá", address: "R. dos Vendas, 725", zip: "79003-040" }
                      ].map((store, i) => (
                        <div key={i} style={{ borderBottom: i === 3 ? 'none' : '1px solid #eee', paddingBottom: '0.8rem' }}>
                          <h4 style={{ margin: '0 0 0.3rem 0', color: 'var(--primary-color)', fontSize: '0.95rem' }}>{store.name}</h4>
                          <p style={{ margin: '0', fontSize: '0.8rem', color: '#666' }}>{store.address}<br/>CEP: {store.zip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </li>
              <li><a href="/clube" className="nav-btn">Clube de Vantagens</a></li>
            </ul>
          </div>

          <div className="delivery-info-header">
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '0.85rem' }}>
               <MapPin size={16} />
               {selectedStore ? `Entregando em: ${selectedStore}` : "Defina sua localização"}
             </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
