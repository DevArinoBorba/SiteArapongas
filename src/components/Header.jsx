import { useState, useEffect } from 'react';
import { Search, ShoppingCart, User, MapPin, Phone, Clock, FileText, Menu, Send } from 'lucide-react';

export default function Header({ cartItemCount, onOpenCart, searchQuery, setSearchQuery }) {
  const [showHours, setShowHours] = useState(false);
  
  const [isZipOpen, setIsZipOpen] = useState(false);
  const [isStoresOpen, setIsStoresOpen] = useState(false);
  const [zipInput, setZipInput] = useState('');
  const [isLoadingZip, setIsLoadingZip] = useState(false);
  const [selectedStore, setSelectedStore] = useState(() => {
    return localStorage.getItem('arapongas_location') || null;
  });

  const STORES = [
    { name: "Arapongas Margarida", lat: -20.44318, lng: -54.59762 },
    { name: "Arapongas Santa Fé", lat: -20.44908, lng: -54.60412 },
    { name: "Arapongas São Francisco", lat: -20.45452, lng: -54.60123 },
    { name: "Arapongas Itanhagá", lat: -20.47712, lng: -54.59123 }
  ];

  // Fórmula de Haversine para calcular distância entre dois pontos no globo
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Raio da Terra em KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distância em KM
  };

  const handleZipSubmit = async (e) => {
    e.preventDefault();
    const cleanCep = zipInput.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      alert("Por favor, digite um CEP válido com 8 dígitos.");
      return;
    }

    setIsLoadingZip(true);
    try {
      // 1. Busca endereço via ViaCEP
      const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const addressData = await viaCepRes.json();
      
      if (addressData.erro) throw new Error("CEP não encontrado");

      // 2. Busca coordenadas via Nominatim (OpenStreetMap) - Gratuito
      const searchQuery = `${addressData.logradouro}, ${addressData.bairro}, ${addressData.localidade}, MS`;
      const nominatimRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const geoData = await nominatimRes.json();

      if (geoData && geoData.length > 0) {
        const userLat = parseFloat(geoData[0].lat);
        const userLng = parseFloat(geoData[0].lon);

        // 3. Encontra a loja mais próxima
        let closest = null;
        let minDistance = Infinity;

        STORES.forEach(store => {
          const dist = calculateDistance(userLat, userLng, store.lat, store.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closest = { ...store, distance: dist };
          }
        });

        if (closest) {
          const locationString = `${closest.name} (${closest.distance.toFixed(1)}km)`;
          setSelectedStore(locationString);
          localStorage.setItem('arapongas_location', locationString);
          setIsZipOpen(false);
        }
      } else {
        // Fallback: Se geocoding falhar, usa a lógica de faixas anterior ou avisa
        alert("Não conseguimos calcular a distância exata, mas tentaremos localizar pelo setor.");
        const fallbackPrefix = parseInt(cleanCep.substring(0, 5));
        let fallbackStore = "Arapongas Itanhagá";
        if (fallbackPrefix >= 79000 && fallbackPrefix <= 79015) fallbackStore = "Arapongas Margarida";
        setSelectedStore(fallbackStore);
        localStorage.setItem('arapongas_location', fallbackStore);
        setIsZipOpen(false);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao consultar localização. Verifique sua conexão.");
    } finally {
      setIsLoadingZip(false);
    }
  };
  return (
    <header style={{ backgroundColor: 'var(--primary-color)' }}>
      {/* Andar 1: Faixa de Utilidades (Utility Bar) */}
      <div style={{ backgroundColor: '#130d0a', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0.4rem 0', fontSize: '0.8rem', color: 'var(--accent-color)' }}>
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
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 1rem' }}>

        <div
          onClick={() => window.location.href = '/'}
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <img
            src="/logo.png"
            alt="Arapongas Supermercados"
            style={{ height: '130px', objectFit: 'contain' }}
          />
        </div>

        <div style={{ flex: 1, padding: '0 3rem' }}>
          <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
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

        <div className="header-actions" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <button
            style={{ position: 'relative', color: 'var(--bg-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}
            onClick={onOpenCart}
          >
            <div style={{ position: 'relative' }}>
              <ShoppingCart size={24} />
              {cartItemCount > 0 && (
                <span style={{ position: 'absolute', top: '-8px', right: '-10px', backgroundColor: 'var(--accent-color)', color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {cartItemCount}
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)' }}>Carrinho</span>
          </button>
        </div>
      </div>

      {/* Andar 3: Navigation */}
      <nav style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '0.6rem 0', color: 'var(--bg-color)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
          <div></div> {/* Spacer para centralização perfeita */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
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
                        { 
                          name: "Arapongas Margarida", 
                          address: "R. Navirai, 526 - Vila Margarida, Campo Grande - MS", 
                          zip: "79023-162",
                          link: "https://www.google.com/maps/search/?api=1&query=Arapongas+Margarida+R.+Navirai,+526+-+Vila+Margarida" 
                        },
                        { 
                          name: "Arapongas Santa Fé", 
                          address: "R. Abrão Júlio Rahe, 2377 - Santa Fe, Campo Grande - MS", 
                          zip: "79021-120",
                          link: "https://www.google.com/maps/search/?api=1&query=Arapongas+Santa+fe+R.+Abrão+Júlio+Rahe,+2377" 
                        },
                        { 
                          name: "Arapongas São Francisco", 
                          address: "R. Amazonas, 1101 - Monte Castelo, Campo Grande - MS", 
                          zip: "79002-280",
                          link: "https://www.google.com/maps/search/?api=1&query=Arapongas+São+Francisco+R.+Amazonas,+1101" 
                        },
                        { 
                          name: "Arapongas Itanhagá", 
                          address: "R. dos Vendas, 725 - Jardim Bela Vista, Campo Grande - MS", 
                          zip: "79003-040",
                          link: "https://www.google.com/maps/search/?api=1&query=Arapongas+Itanhagá+R.+dos+Vendas,+725" 
                        }
                      ].map((store, i) => (
                        <div key={i} style={{ borderBottom: i === 3 ? 'none' : '1px solid #eee', paddingBottom: '0.8rem' }}>
                          <h4 style={{ margin: '0 0 0.3rem 0', color: 'var(--primary-color)', fontSize: '0.95rem' }}>{store.name}</h4>
                          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#666', lineHeight: '1.4' }}>{store.address}<br/>CEP: {store.zip}</p>
                          <a 
                            href={store.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.4rem', 
                              fontSize: '0.75rem', 
                              backgroundColor: 'var(--accent-color)', 
                              color: 'var(--primary-color)', 
                              padding: '0.4rem 0.8rem', 
                              borderRadius: '4px', 
                              textDecoration: 'none',
                              fontWeight: 'bold'
                            }}
                          >
                            📍 Ver no Google Maps
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </li>
              <li><a href="/clube" className="nav-btn">Clube de Vantagens</a></li>
            </ul>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setIsZipOpen(!isZipOpen)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  background: 'none', 
                  border: 'none', 
                  color: 'inherit', 
                  cursor: 'pointer',
                  fontSize: 'inherit'
                }}
              >
                <MapPin size={16} /> 
                {selectedStore ? `Entregando em: ${selectedStore}` : "Ver opções de entrega"}
              </button>

              {isZipOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  marginTop: '10px',
                  backgroundColor: 'white',
                  padding: '1rem',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  zIndex: 2000,
                  width: '280px',
                  color: 'var(--text-main)'
                }}>
                  <p style={{ margin: '0 0 0.8rem 0', fontSize: '0.9rem', fontWeight: 'bold' }}>Digite seu CEP para ver a loja que atende sua região:</p>
                  <form onSubmit={handleZipSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      placeholder={isLoadingZip ? "Calculando..." : "00000-000"}
                      disabled={isLoadingZip}
                      value={zipInput}
                      onChange={(e) => setZipInput(e.target.value)}
                      style={{ 
                        flex: 1, 
                        padding: '0.5rem', 
                        borderRadius: '4px', 
                        border: '1px solid var(--border-color)',
                        outline: 'none',
                        opacity: isLoadingZip ? 0.5 : 1
                      }}
                    />
                    <button 
                      type="submit"
                      disabled={isLoadingZip}
                      style={{ 
                        backgroundColor: 'var(--primary-color)', 
                        color: 'white', 
                        border: 'none', 
                        padding: '0.5rem 1rem', 
                        borderRadius: '4px',
                        cursor: isLoadingZip ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isLoadingZip ? "..." : <Send size={16} />}
                    </button>
                  </form>
                  {selectedStore && (
                    <p style={{ marginTop: '0.8rem', fontSize: '0.8rem', color: 'green' }}>✓ Você está na zona de atendimento da unidade {selectedStore.split(' ').pop()}.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
