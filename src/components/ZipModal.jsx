import { useState, useEffect } from 'react';
import { MapPin, Send, CheckCircle } from 'lucide-react';

export default function ZipModal({ onLocationSelected }) {
  const [isOpen, setIsOpen] = useState(false);
  const [zipInput, setZipInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [closestStore, setClosestStore] = useState(null);

  const STORES = [
    { name: "Arapongas Margarida", lat: -20.44318, lng: -54.59762 },
    { name: "Arapongas Santa Fé", lat: -20.44908, lng: -54.60412 },
    { name: "Arapongas São Francisco", lat: -20.45452, lng: -54.60123 },
    { name: "Arapongas Itanhagá", lat: -20.47712, lng: -54.59123 }
  ];

  useEffect(() => {
    const savedLocation = localStorage.getItem('arapongas_location');
    if (!savedLocation) {
      setIsOpen(true);
    }
  }, []);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleZipSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanCep = zipInput.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsLoading(true);
    try {
      const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const addressData = await viaCepRes.json();
      if (addressData.erro) throw new Error("CEP não encontrado");

      const searchQuery = `${addressData.logradouro}, ${addressData.bairro}, ${addressData.localidade}, MS`;
      const nominatimRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const geoData = await nominatimRes.json();

      if (geoData && geoData.length > 0) {
        const userLat = parseFloat(geoData[0].lat);
        const userLng = parseFloat(geoData[0].lon);

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
          setClosestStore(closest);
        }
      } else {
        // Fallback
        const fallbackPrefix = parseInt(cleanCep.substring(0, 5));
        let fallbackStore = "Arapongas Itanhagá";
        if (fallbackPrefix >= 79000 && fallbackPrefix <= 79015) fallbackStore = "Arapongas Margarida";
        setClosestStore({ name: fallbackStore, distance: 0, isFallback: true });
      }
    } catch (err) {
      console.error(err);
      alert("CEP não encontrado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!closestStore) return;
    const locationString = closestStore.isFallback 
      ? closestStore.name 
      : `${closestStore.name} (${closestStore.distance.toFixed(1)}km)`;
    
    localStorage.setItem('arapongas_location', locationString);
    onLocationSelected(locationString);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2.5rem',
        borderRadius: '24px',
        width: '90%',
        maxWidth: '450px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        textAlign: 'center',
        animation: 'modalFadeIn 0.4s ease-out'
      }}>
        <div style={{ 
          width: '60px', 
          height: '60px', 
          backgroundColor: '#f8fafc', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto'
        }}>
          <MapPin size={30} color="var(--primary-color)" />
        </div>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.8rem', color: '#1a1a1a', fontWeight: '800' }}>
          Bem-vindo ao Arapongas
        </h2>
        <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '1rem', lineHeight: '1.5' }}>
          Digite seu CEP para ver a loja que atende sua região:
        </p>

        <form onSubmit={handleZipSubmit} style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem' }}>
          <input 
            type="text" 
            placeholder="00000-000"
            value={zipInput}
            onChange={(e) => setZipInput(e.target.value)}
            style={{
              flex: 1,
              padding: '1rem 1.2rem',
              borderRadius: '12px',
              border: '2px solid #e2e8f0',
              fontSize: '1.1rem',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
          <button 
            type="submit"
            disabled={isLoading || zipInput.replace(/\D/g, '').length !== 8}
            style={{
              backgroundColor: '#1a1a1a',
              color: 'white',
              padding: '1rem',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '60px',
              opacity: (isLoading || zipInput.replace(/\D/g, '').length !== 8) ? 0.6 : 1
            }}
          >
            {isLoading ? <div className="spinner-small" /> : <Send size={22} />}
          </button>
        </form>

        {closestStore && (
          <div style={{ 
            backgroundColor: '#f0fdf4', 
            border: '1px solid #bbf7d0', 
            padding: '1.2rem', 
            borderRadius: '16px',
            marginBottom: '2rem',
            textAlign: 'left',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <CheckCircle size={20} color="#16a34a" />
              <div>
                <div style={{ color: '#166534', fontWeight: '700', fontSize: '0.9rem' }}>
                  {closestStore.isFallback ? 'Região Localizada!' : 'Loja mais próxima encontrada!'}
                </div>
                <div style={{ color: '#15803d', fontSize: '0.95rem' }}>
                   {closestStore.name} {closestStore.distance > 0 && `(${closestStore.distance.toFixed(1)}km)`}
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleConfirm}
              style={{
                width: '100%',
                marginTop: '1rem',
                padding: '0.8rem',
                backgroundColor: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Começar a Comprar
            </button>
          </div>
        )}

        <button 
          onClick={() => setIsOpen(false)}
          style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Ver sem CEP por enquanto
        </button>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .spinner-small {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
