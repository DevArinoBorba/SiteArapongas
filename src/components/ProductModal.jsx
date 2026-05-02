import { X, Plus, ShoppingBag } from 'lucide-react';
import { useState } from 'react';

export default function ProductModal({ product, onClose, onAddToCart }) {
  if (!product) return null;

  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    // Adiciona ao carrinho repassando a quantidade correta se necessário,
    // Mas a função onAddToCart atual espera apenas o objeto produto e adiciona 1 un por clique.
    // Vamos chamar repetições ou editar a lógica de onAddToCart pra receber qty, aqui vou assumir Múltiplos clicks
    for (let i = 0; i < quantity; i++) {
        onAddToCart(product);
    }
    onClose();
  };

  return (
    <div className="cart-overlay open" onClick={onClose} style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="cart-panel product-modal-container" onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '90%', maxWidth: '900px', height: 'auto', maxHeight: '95vh', overflowY: 'auto', borderRadius: '16px', display: 'flex', transform: 'none', right: 'auto', top: 'auto', padding: 0 }}>
        
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'white', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <X size={24} />
        </button>

        <div style={{ flex: '1 1 350px', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <img src={product.image} alt={product.name} style={{ width: '100%', maxWidth: '300px', objectFit: 'contain', mixBlendMode: 'multiply' }} />
        </div>

        <div style={{ flex: '1 1 350px', padding: '2.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>{product.category} • {product.brand}</div>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#1f2937', fontWeight: '800', lineHeight: 1.2 }}>{product.name}</h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            {product.club_price ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                  De: R$ {product.price.toFixed(2).replace('.', ',')}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '2.8rem', fontWeight: '900', color: 'var(--accent-color)' }}>
                    R$ {product.club_price.toFixed(2).replace('.', ',')}
                  </span>
                  <div style={{ backgroundColor: '#fdf2f8', color: '#db2777', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Clube Arapongas
                  </div>
                </div>
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/{product.unit}</span>
              </div>
            ) : (
              <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary-color)' }}>
                R$ {product.price.toFixed(2).replace('.', ',')}
                <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 'normal' }}> /{product.unit}</span>
              </div>
            )}
          </div>

          <p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: '2rem' }}>
            Produto selecionado com a melhor qualidade para a sua casa. No Arapongas Supermercados, garantimos frescor e procedência em todos os itens do nosso catálogo.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.5rem', background: '#fff' }}>
              <button 
                 onClick={() => setQuantity(Math.max(1, quantity - 1))}
                 style={{ padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                  <X size={14} style={{ opacity: 0 }}/> {/* Spacer */}
                  -
              </button>
              <span style={{ width: '40px', textAlign: 'center', fontWeight: 'bold' }}>{quantity}</span>
              <button 
                 onClick={() => setQuantity(quantity + 1)}
                 style={{ padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                  +
              </button>
            </div>

            <button 
               className="btn btn-primary" 
               onClick={handleAdd}
               style={{ flex: 1, display: 'flex', gap: '0.5rem', justifyContent: 'center', padding: '1rem', borderRadius: '8px', fontSize: '1.1rem' }}
            >
              <ShoppingBag size={20} /> Adicionar R$ {(product.price * quantity).toFixed(2).replace('.', ',')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
