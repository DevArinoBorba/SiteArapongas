import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, CreditCard, Calendar, MapPin, Phone, Store, CheckCircle, Sparkles } from 'lucide-react';

export default function ClubRegistration() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    birth_date: '',
    address: '',
    phone: '',
    preferred_store: 'Arapongas Supermercados - Matriz'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.error) {
        alert(data.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 4000);
      }
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      alert('Erro ao realizar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Header Minimalista */}
      <header style={{ backgroundColor: 'white', padding: '1rem 0', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--primary-color)', fontWeight: 'bold' }}>
            <ArrowLeft size={20} /> Voltar para a Loja
          </Link>
          <img src="/logo.png" alt="Arapongas" style={{ height: '40px' }} />
          <div style={{ width: '120px' }}></div> {/* Spacer */}
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={{ 
          maxWidth: '800px', 
          width: '100%', 
          backgroundColor: 'white', 
          borderRadius: '16px', 
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
        }}>
          
          {/* Lado Esquerdo - Info Visual */}
          <div style={{ 
            backgroundColor: 'var(--primary-color)', 
            padding: '3rem', 
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundImage: 'linear-gradient(135deg, var(--primary-color) 0%, #1e293b 100%)'
          }}>
            <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', marginBottom: '2rem', width: 'fit-content' }}>
               <Sparkles size={40} color="var(--accent-color)" />
            </div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: 'white' }}>Clube de Vantagens Arapongas</h1>
            <p style={{ fontSize: '1.1rem', opacity: 0.9, lineHeight: '1.6', marginBottom: '2rem' }}>
              Junte-se a milhares de clientes que já economizam todos os dias com preços exclusivos para membros.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <div style={{ backgroundColor: 'var(--accent-color)', borderRadius: '50%', padding: '4px' }}><CheckCircle size={16} color="black" /></div>
                  Preços de atacado no varejo
               </li>
               <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <div style={{ backgroundColor: 'var(--accent-color)', borderRadius: '50%', padding: '4px' }}><CheckCircle size={16} color="black" /></div>
                  Ofertas personalizadas para você
               </li>
               <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <div style={{ backgroundColor: 'var(--accent-color)', borderRadius: '50%', padding: '4px' }}><CheckCircle size={16} color="black" /></div>
                  Acúmulo de pontos em todas as compras
               </li>
            </ul>
          </div>

          {/* Lado Direito - Formulário */}
          <div style={{ padding: '3rem' }}>
            {success ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', animation: 'fadeIn 0.5s ease' }}>
                <div style={{ color: '#10b981', marginBottom: '1.5rem' }}>
                  <CheckCircle size={80} style={{ margin: '0 auto' }} />
                </div>
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Seja Bem-vindo!</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                  Seu cadastro foi realizado com sucesso. Redirecionando você para a loja...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Nome Completo</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: João da Silva" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      style={{ width: '100%', padding: '0.8rem 0.8rem 0.8rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold' }}>CPF</label>
                    <div style={{ position: 'relative' }}>
                      <CreditCard size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input 
                        required
                        type="text" 
                        placeholder="000.000.000-00" 
                        value={formData.cpf}
                        onChange={e => setFormData({...formData, cpf: e.target.value})}
                        style={{ width: '100%', padding: '0.8rem 0.8rem 0.8rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Nascimento</label>
                    <div style={{ position: 'relative' }}>
                      <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input 
                        required
                        type="date" 
                        value={formData.birth_date}
                        onChange={e => setFormData({...formData, birth_date: e.target.value})}
                        style={{ width: '100%', padding: '0.8rem 0.8rem 0.8rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold' }}>WhatsApp / Telefone</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      required
                      type="tel" 
                      placeholder="(67) 99999-9999" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      style={{ width: '100%', padding: '0.8rem 0.8rem 0.8rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Endereço Residencial</label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      required
                      type="text" 
                      placeholder="Rua, Número, Bairro" 
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      style={{ width: '100%', padding: '0.8rem 0.8rem 0.8rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Sua Loja Favorita</label>
                  <div style={{ position: 'relative' }}>
                    <Store size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <select 
                      value={formData.preferred_store}
                      onChange={e => setFormData({...formData, preferred_store: e.target.value})}
                      style={{ width: '100%', padding: '0.8rem 0.8rem 0.8rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', cursor: 'pointer' }}
                    >
                      <option>Arapongas Supermercados - Matriz</option>
                      <option>Arapongas Supermercados - Unidade 02</option>
                    </select>
                  </div>
                </div>

                <button 
                  disabled={loading}
                  className="btn btn-primary" 
                  style={{ marginTop: '1rem', padding: '1.2rem', fontSize: '1.1rem', fontWeight: 'bold' }}
                >
                  {loading ? 'Validando Dados...' : 'Finalizar Cadastro Gratuito'}
                </button>
                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                  Ao se cadastrar, você concorda com nossos termos de privacidade.
                </p>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
        Arapongas Supermercados Ltda © 2026 - Todos os Direitos Reservados
      </footer>
    </div>
  );
}
