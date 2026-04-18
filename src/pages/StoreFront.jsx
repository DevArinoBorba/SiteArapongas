import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Categories from '../components/Categories';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import Cart from '../components/Cart';

export default function StoreFront() {
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem('arapongas_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortOption, setSortOption] = useState('Destaque'); // 'Destaque', 'Menor Preço', 'Maior Preço', 'A-Z'
  const [toastMessage, setToastMessage] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [serverCategories, setServerCategories] = useState([]);
  const itemsPerPage = 32;

  useEffect(() => {
    setLoading(true);
    const categoryQuery = selectedCategory ? `&category=${selectedCategory}` : '';
    const searchQueryStr = searchQuery ? `&search=${searchQuery}` : '';
    
    fetch(`/api/products?page=${currentPage}&limit=${itemsPerPage}${categoryQuery}${searchQueryStr}`)
      .then(res => res.json())
      .then(data => {
        if (data.message === 'success') {
          setProducts(data.data);
          setTotalProducts(data.total);
          if (data.categories) setServerCategories(data.categories);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [currentPage, selectedCategory, searchQuery]);

  // Resetar página ao filtrar ou pesquisar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortOption]);

  useEffect(() => {
    localStorage.setItem('arapongas_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const handleAddToCart = (product) => {
    // Registrar métrica
    fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        event_type: 'add_to_cart', 
        product_id: product.id, 
        product_name: product.name 
      })
    }).catch(err => console.error('Erro ao registrar métrica:', err));

    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setToastMessage(`${product.name} adicionado ao carrinho!`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleUpdateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveFromCart(productId);
      return;
    }
    setCartItems(prev => prev.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item));
  };

  const handleRemoveFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Categorias do Servidor
  const uniqueCategories = serverCategories.length > 0 ? serverCategories : ['Geral'];

  // Paginação
  const totalPages = Math.ceil(totalProducts / itemsPerPage);
  const currentProducts = products; // Já vem paginado do servidor!

  return (
    <>
      <Header 
        cartItemCount={cartItemCount} 
        onOpenCart={() => setIsCartOpen(true)} 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <main>
        {toastMessage && (
          <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--accent-color)', color: '#000', padding: '1rem 2rem', borderRadius: '30px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'fadeIn 0.3s ease-in-out' }}>
            🛒 {toastMessage}
          </div>
        )}
        <Hero />

        {/* TRUST MARKERS */}
        <section style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', padding: '1.5rem 0' }}>
          <div className="container flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--primary-color)' }}>
               <div style={{ color: 'var(--accent-color)' }}>🚚</div>
               <div>
                  <h4 style={{ fontSize: '0.9rem', margin: 0 }}>Receba em Casa</h4>
                  <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-muted)' }}>Entregas ágeis toda a cidade.</p>
               </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--primary-color)' }}>
               <div style={{ color: 'var(--accent-color)' }}>💳</div>
               <div>
                  <h4 style={{ fontSize: '0.9rem', margin: 0 }}>Pague na Entrega</h4>
                  <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-muted)' }}>PIX, Crédito e Débito.</p>
               </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--primary-color)' }}>
               <div style={{ color: 'var(--accent-color)' }}>🛡️</div>
               <div>
                  <h4 style={{ fontSize: '0.9rem', margin: 0 }}>Qualidade Garantida</h4>
                  <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-muted)' }}>Selecionados para você.</p>
               </div>
            </div>
          </div>
        </section>

        <Categories 
           categories={uniqueCategories}
           selectedCategory={selectedCategory}
           onSelectCategory={setSelectedCategory}
        />
        
        <section className="container products-section" style={{ paddingTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              {searchQuery ? `Resultados para "${searchQuery}"` : selectedCategory ? `Setor: ${selectedCategory}` : 'Em Destaque'}
            </h2>
            <select 
              value={sortOption} 
              onChange={e => setSortOption(e.target.value)}
              style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', cursor: 'pointer', backgroundColor: 'var(--card-bg)' }}
            >
              <option value="Destaque">Ordernar por: Destaque</option>
              <option value="Menor Preço">Menor Preço</option>
              <option value="Maior Preço">Maior Preço</option>
              <option value="A-Z">Ordem Alfabética (A-Z)</option>
            </select>
          </div>
          {loading ? (
             <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Sincronizando prateleiras com o ERP...</p>
          ) : (
            <>
              <div className="products-grid">
                {currentProducts.length > 0 ? (
                  currentProducts.map(product => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      onAddToCart={handleAddToCart}
                      onClick={() => setSelectedProduct(product)} 
                    />
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>Nenhum produto encontrado para este filtro.</p>
                )}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginTop: '4rem', padding: '2rem 0' }}>
                   <button 
                     className="btn btn-outline" 
                     disabled={currentPage === 1}
                     onClick={() => {
                       setCurrentPage(prev => prev - 1);
                       window.scrollTo({ top: 400, behavior: 'smooth' });
                     }}
                     style={{ opacity: currentPage === 1 ? 0.4 : 1, padding: '0.8rem 1.5rem', borderRadius: '30px' }}
                   >
                     ← Anterior
                   </button>
                   
                   <span style={{ color: 'var(--primary-color)', fontWeight: '600', fontSize: '1.1rem' }}>
                     Página {currentPage} de {totalPages}
                   </span>

                   <button 
                     className="btn btn-outline" 
                     disabled={currentPage === totalPages}
                     onClick={() => {
                       setCurrentPage(prev => prev + 1);
                       window.scrollTo({ top: 400, behavior: 'smooth' });
                     }}
                     style={{ opacity: currentPage === totalPages ? 0.4 : 1, padding: '0.8rem 1.5rem', borderRadius: '30px' }}
                   >
                     Próxima →
                   </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <footer style={{ backgroundColor: '#130d0a', color: 'var(--bg-color)', padding: '4rem 0 2rem 0', marginTop: 'auto' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          {/* Logo Column */}
          <div>
            <img src="/logo.png" alt="Arapongas" style={{ height: '60px', objectFit: 'contain', marginBottom: '1rem' }} />
            <p style={{fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6'}}>Sinta a diferença e viva a experiência premium em cada detalhe. Da nossa loja à sua mesa.</p>
          </div>
          
          {/* Dept Column */}
          <div>
            <h4 style={{ color: 'var(--bg-color)', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Departamentos</h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
               <li><a href="#" style={{ textDecoration: 'none' }}>Açougue Nobre</a></li>
               <li><a href="#" style={{ textDecoration: 'none' }}>Hortifruti Fresco</a></li>
               <li><a href="#" style={{ textDecoration: 'none' }}>Adega & Vinhos</a></li>
               <li><a href="#" style={{ textDecoration: 'none' }}>Mercearia Fina</a></li>
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h4 style={{ color: 'var(--bg-color)', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Atendimento</h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
               <li>(67) 3304-5100</li>
               <li>(67) 99221-1941 (WhatsApp)</li>
               <li>Seg a Sáb: 07h às 20h</li>
               <li>Dom: 07:30h às 13h</li>
            </ul>
          </div>
          
          {/* Payment Column */}
          <div>
            <h4 style={{ color: 'var(--bg-color)', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Formas de Pagamento</h4>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '1.5rem' }}>
               💳 💸 📱 🛒
            </div>
            <p style={{fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem'}}>Pagamento seguro no ato da entrega ou via aplicativo.</p>
          </div>
        </div>
        
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
           Arapongas Supermercado Ltda - CNPJ: 40.343.479/0001-83 | © 2026 Todos os direitos reservados.
        </div>
      </footer>

      <Cart 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemove={handleRemoveFromCart}
      />
      
      {selectedProduct && (
        <ProductModal 
           product={selectedProduct} 
           onClose={() => setSelectedProduct(null)} 
           onAddToCart={handleAddToCart} 
        />
      )}
    </>
  );
}
