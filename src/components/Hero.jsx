import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, CreditCard, Tag, Store, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export default function Hero() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      type: 'offers',
      image: '/hero.png',
      title: 'Sinta a diferença e viva a experiência!',
      subtitle: 'Produtos selecionados com carinho para a sua mesa com a qualidade e tradição do Arapongas.',
      buttonText: 'Aproveitar Ofertas',
      btnAction: () => {
         const el = document.querySelector('.products-section');
         if(el) el.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      type: 'club',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80',
      title: 'Seja Membro do Clube de Vantagens!',
      subtitle: 'Cadastre-se agora e tenha acesso imediato a preços exclusivos e ofertas que só nossos sócios possuem.',
      buttonText: 'Quero Ser Membro Agora',
      btnAction: () => navigate('/clube'),
      isSpecial: true
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setCurrentSlide(prev => (prev === 0 ? slides.length - 1 : prev - 1));

  return (
    <section className="container hero-section" style={{ position: 'relative' }}>
      <div className="hero-banner" style={{ overflow: 'hidden', position: 'relative', minHeight: '400px' }}>
        
        {slides.map((slide, idx) => (
          <div 
            key={idx}
            className={`hero-slide ${currentSlide === idx ? 'active' : ''}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: currentSlide === idx ? 1 : 0,
              transition: 'opacity 0.8s ease-in-out',
              display: 'flex',
              alignItems: 'center',
              zIndex: currentSlide === idx ? 1 : 0
            }}
          >
            <img 
              src={slide.image} 
              alt={slide.title} 
              style={{ 
                position: 'absolute', 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover', 
                filter: slide.isSpecial ? 'brightness(0.6)' : 'none' 
              }} 
            />
            <div className="hero-content" style={{ position: 'relative', zIndex: 2 }}>
              {slide.isSpecial && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--accent-color)', color: 'black', padding: '0.4rem 1rem', borderRadius: '50px', marginBottom: '1rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  <Sparkles size={16} /> NOVIDADE NO ARAPONGAS
                </div>
              )}
              <h2 style={{ color: slide.isSpecial ? 'white' : 'inherit' }}>{slide.title}</h2>
              <p style={{ 
                marginBottom: '1.5rem', 
                fontSize: '1.1rem', 
                color: slide.isSpecial ? 'rgba(255,255,255,0.9)' : 'var(--text-muted)' 
              }}>
                {slide.subtitle}
              </p>
              <button 
                className={`btn ${slide.isSpecial ? 'btn-primary' : 'btn-primary'}`} 
                onClick={slide.btnAction}
                style={{ scale: slide.isSpecial ? '1.1' : '1' }}
              >
                {slide.buttonText}
              </button>
            </div>
          </div>
        ))}

        {/* Carousel Controls */}
        <button onClick={prevSlide} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', color: 'white' }}>
          <ChevronLeft size={24} />
        </button>
        <button onClick={nextSlide} style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', color: 'white' }}>
          <ChevronRight size={24} />
        </button>

        {/* Dots */}
        <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: '0.5rem' }}>
          {slides.map((_, i) => (
            <div 
              key={i} 
              onClick={() => setCurrentSlide(i)}
              style={{ 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                backgroundColor: currentSlide === i ? 'var(--accent-color)' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer'
              }} 
            />
          ))}
        </div>
      </div>

      <div className="hero-utilities">
        <button className="utility-item">
          <Store size={20} /> Retire na Loja
        </button>
        <button className="utility-item">
          <Truck size={20} /> Delivery Rápido
        </button>
        <button className="utility-item">
          <CreditCard size={20} /> Cartão da Loja
        </button>
        <button className="utility-item">
          <Tag size={20} /> Marcas Exclusivas
        </button>
      </div>
    </section>
  );
}
