import { Plus, Check } from 'lucide-react';
import { useState } from 'react';

export default function ProductCard({ product, onAddToCart, onClick }) {
  const [added, setAdded] = useState(false);

  const handleAdd = (e) => {
    e.stopPropagation(); // Evita que o click do card acione o modal
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="product-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="product-image-container">
        <img src={product.image} alt={product.name} />
      </div>
      <div className="product-brand">{product.brand}</div>
      <h3 className="product-title">{product.name}</h3>
      
      <div className="product-price-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
        {product.club_price ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
               <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                 R$ {product.price.toFixed(2).replace('.', ',')}
               </span>
               <span style={{ fontSize: '0.7rem', fontWeight: '800', backgroundColor: '#fdf2f8', color: '#db2777', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                 Clube
               </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
               <div>
                  <span className="product-price" style={{ color: 'var(--accent-color)', fontWeight: '900', fontSize: '1.4rem' }}>
                    R$ {product.club_price.toFixed(2).replace('.', ',')}
                  </span>
                  {product.unit && <span className="product-price-unit" style={{ fontSize: '0.8rem' }}> /{product.unit}</span>}
               </div>
               <button 
                className="add-to-cart-btn" 
                onClick={handleAdd}
                title="Adicionar ao carrinho"
                style={{ backgroundColor: added ? '#10b981' : '', color: added ? 'white' : '' }}
              >
                {added ? <Check size={20} /> : <Plus size={20} />}
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div>
              <span className="product-price">R$ {product.price.toFixed(2).replace('.', ',')}</span>
              {product.unit && <span className="product-price-unit"> /{product.unit}</span>}
            </div>
            <button 
              className="add-to-cart-btn" 
              onClick={handleAdd}
              title="Adicionar ao carrinho"
              style={{ backgroundColor: added ? '#10b981' : '', color: added ? 'white' : '' }}
            >
              {added ? <Check size={20} /> : <Plus size={20} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
