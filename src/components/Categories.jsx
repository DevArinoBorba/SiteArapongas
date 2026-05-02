import { useRef } from 'react';
import { 
  ShoppingBag, 
  Beef, 
  Carrot, 
  Milk, 
  Croissant, 
  Wine, 
  ShoppingBasket, 
  Sparkles, 
  Hand, 
  Package,
  ChevronLeft,
  ChevronRight,
  Tag,
  Home,
  Dumbbell,
  Heart
} from 'lucide-react'; 

export default function Categories({ categories, selectedCategory, onSelectCategory }) {
  const scrollRef = useRef(null);

  if (!categories || categories.length === 0) return null;

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const categoryMap = {
    'Açougue': { Icon: Beef, color: '#fee2e2' },
    'Hortifruti': { Icon: Carrot, color: '#f0fdf4' },
    'Laticínios': { Icon: Milk, color: '#fffbeb' },
    'Padaria': { Icon: Croissant, color: '#fff7ed' },
    'Mercearia': { Icon: ShoppingBasket, color: '#f8fafc' },
    'Bebidas': { Icon: Wine, color: '#fdf2f8' },
    'Adega': { Icon: Wine, color: '#fdf2f8' },
    'Limpeza': { Icon: Sparkles, color: '#f0f9ff' },
    'Higiene': { Icon: Hand, color: '#f5f3ff' },
    'Cuidados Pessoal': { Icon: Heart, color: '#fce7f3' },
    'Casa': { Icon: Home, color: '#ffedd5' },
    'Fitness': { Icon: Dumbbell, color: '#dcfce7' },
    'Ofertas': { Icon: Tag, color: '#fee2e2' }
  };

  return (
    <section className="categories-section" style={{ padding: '2rem 0', backgroundColor: '#fff' }}>
      <div className="container" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '700', color: 'var(--primary-color)' }}>Explorar Setores</h2>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => scroll('left')}
              className="carousel-nav-btn"
              style={{ padding: '0.4rem', borderRadius: '50%', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={() => scroll('right')}
              className="carousel-nav-btn"
              style={{ padding: '0.4rem', borderRadius: '50%', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="categories-scroll-container"
          style={{ 
            display: 'flex', 
            gap: '1rem', 
            overflowX: 'auto', 
            paddingBottom: '1rem',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollSnapType: 'x mandatory'
          }}
        >
          {/* Todas as Categorias */}
          <div 
            onClick={() => onSelectCategory(null)}
            className="category-chip"
            style={{ 
              flex: '0 0 auto',
              scrollSnapAlign: 'start',
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.6rem',
              padding: '0.6rem 1.2rem', 
              borderRadius: '50px', 
              cursor: 'pointer', 
              backgroundColor: !selectedCategory ? 'var(--accent-color)' : '#f8fafc', 
              color: !selectedCategory ? 'var(--primary-color)' : 'var(--text-main)', 
              border: '1px solid',
              borderColor: !selectedCategory ? 'var(--accent-color)' : '#e2e8f0', 
              transition: 'all 0.2s ease'
            }}
          >
            <Tag size={18} color={!selectedCategory ? 'var(--primary-color)' : 'var(--accent-color)'} />
            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Ofertas</span>
          </div>

          {categories.map((cat, index) => {
            const config = categoryMap[cat] || { Icon: Package, color: '#f8fafc' };
            const IconComp = config.Icon;
            const isSelected = selectedCategory === cat;

            return (
              <div 
                key={index} 
                onClick={() => onSelectCategory(cat)}
                className="category-chip"
                style={{ 
                  flex: '0 0 auto',
                  scrollSnapAlign: 'start',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.6rem',
                  padding: '0.6rem 1.2rem', 
                  borderRadius: '50px', 
                  cursor: 'pointer', 
                  backgroundColor: isSelected ? 'var(--accent-color)' : '#f8fafc', 
                  color: isSelected ? 'var(--primary-color)' : 'var(--text-main)', 
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--accent-color)' : '#e2e8f0', 
                  transition: 'all 0.2s ease'
                }}
              >
                <IconComp size={18} color={isSelected ? 'var(--primary-color)' : 'var(--accent-color)'} />
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{cat}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      <style>{`
        .categories-scroll-container::-webkit-scrollbar {
          display: none;
        }
        .category-chip:hover {
          background-color: #ededed !important;
          border-color: var(--accent-color) !important;
        }
        .nav-btn:hover {
          background-color: var(--accent-color) !important;
          color: var(--primary-color);
        }
        .carousel-nav-btn:hover {
          background-color: var(--accent-color) !important;
          color: var(--primary-color);
        }
      `}</style>
    </section>
  );
}
