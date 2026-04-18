import { useState, useEffect } from 'react';
import { X, Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';

export default function Cart({ isOpen, onClose, cartItems, onUpdateQuantity, onRemove }) {
  const [customer, setCustomer] = useState(() => {
    const savedCustomer = localStorage.getItem('arapongas_customer');
    return savedCustomer ? JSON.parse(savedCustomer) : { name: '', address: '', payment: 'Dinheiro', notes: '' };
  });

  const [memberCpf, setMemberCpf] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    localStorage.setItem('arapongas_customer', JSON.stringify(customer));
  }, [customer]);

  const handleValidateCpf = async () => {
    if (!memberCpf) return;
    setValidating(true);
    try {
      const response = await fetch('/api/members/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: memberCpf })
      });
      const data = await response.json();
      if (data.success) {
        setIsMember(true);
        setMemberName(data.member.name);
      } else {
        alert(data.message);
        setIsMember(false);
      }
    } catch (error) {
      console.error('Erro ao validar CPF:', error);
    } finally {
      setValidating(false);
    }
  };

  const originalTotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const clubTotal = cartItems.reduce((acc, item) => {
    const itemPrice = (isMember && item.club_price) ? item.club_price : item.price;
    return acc + (itemPrice * item.quantity);
  }, 0);

  const total = clubTotal;
  const savings = originalTotal - clubTotal;

  const handleCheckout = () => {
    if (!customer.name || !customer.address) {
      alert("Por favor, preencha o seu Nome e Endereço para entrega.");
      return;
    }
    
    // Registrar métrica
    fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'whatsapp_checkout' })
    }).catch(err => console.error('Erro ao registrar métrica:', err));

    // Gerar lista de itens formatada
    let itemsText = cartItems.map(item => {
      const usedClubPrice = isMember && item.club_price;
      const finalPrice = usedClubPrice ? item.club_price : item.price;
      return `📦 ${item.quantity}x *${item.name}* ${usedClubPrice ? '(Preço Clube)' : ''} - R$ ${(finalPrice * item.quantity).toFixed(2)}`;
    }).join('%0A');
    
    let message = `🛒 *NOVO PEDIDO - ARAPONGAS*%0A%0A`;
    message += `*Cliente:* ${customer.name}%0A`;
    if (isMember) message += `⭐ *Membro do Clube:* ${memberName}%0A`;
    message += `*Endereço:* ${customer.address}%0A`;
    message += `*Forma de Pagamento:* ${customer.payment}%0A`;
    if(customer.notes) message += `*Observação:* ${customer.notes}%0A`;
    message += `%0A*ITENS:*%0A${itemsText}%0A%0A`;
    if (savings > 0) message += `✅ *ECONOMIA DO CLUBE: R$ ${savings.toFixed(2)}*%0A`;
    message += `💰 *TOTAL A PAGAR: R$ ${total.toFixed(2)}*`;

    // Abrir WhatsApp Web/App direto na conversa do supermercado
    const whatsappNumber = "5567981108176";
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  return (
    <div className={`cart-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="cart-panel" onClick={e => e.stopPropagation()}>
        
        <div className="cart-header">
          <h2>Seu Carrinho</h2>
          <button className="cart-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="cart-items">
          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <ShoppingCart size={48} />
              <p>Seu carrinho está vazio.</p>
              <button className="btn btn-outline" onClick={onClose}>Continuar Comprando</button>
            </div>
          ) : (
            cartItems.map(item => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} className="cart-item-img" />
                <div className="cart-item-info">
                  <h4 className="cart-item-title">{item.name}</h4>
                  <div className="cart-item-price">R$ {item.price.toFixed(2).replace('.', ',')}</div>
                  <div className="cart-item-actions">
                    <div className="qty-control">
                      <button className="qty-btn" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>
                        <Minus size={14} />
                      </button>
                      <span className="qty-display">{item.quantity}</span>
                      <button className="qty-btn" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <button className="remove-btn flex items-center gap-1" onClick={() => onRemove(item.id)}>
                      <Trash2 size={14} /> Remover
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-footer" style={{ padding: '1.5rem', borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <input 
                type="text" 
                placeholder="Seu Nome Completo" 
                value={customer.name}
                onChange={e => setCustomer({...customer, name: e.target.value})}
                style={{ padding: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
              <input 
                type="text" 
                placeholder="Endereço de Entrega Completo" 
                value={customer.address}
                onChange={e => setCustomer({...customer, address: e.target.value})}
                style={{ padding: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
              <select 
                value={customer.payment}
                onChange={e => setCustomer({...customer, payment: e.target.value})}
                style={{ padding: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
              >
                 <option value="Dinheiro">Pagamento: Dinheiro</option>
                 <option value="PIX">Pagamento: PIX</option>
                 <option value="Cartão de Crédito/Débito">Pagamento: Cartão na Entrega</option>
              </select>

              <div style={{ border: '1px dashed var(--accent-color)', borderRadius: '8px', padding: '1rem', backgroundColor: '#fffcf0', marginTop: '0.5rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--accent-color)', marginBottom: '0.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>⭐ Clube Arapongas</h4>
                {isMember ? (
                  <div style={{ color: '#059669', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    Olá, {memberName.split(' ')[0]}! Descontos aplicados.
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      placeholder="Validar CPF do Clube" 
                      value={memberCpf}
                      onChange={e => setMemberCpf(e.target.value)}
                      style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px', flex: 1, fontSize: '0.85rem' }}
                    />
                    <button 
                      onClick={handleValidateCpf} 
                      disabled={validating}
                      style={{ padding: '0.6rem 1rem', backgroundColor: 'var(--accent-color)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                    >
                      {validating ? '...' : 'Validar'}
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {savings > 0 && (
              <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', border: '1px solid #a7f3d0' }}>
                🤑 Você está economizando <strong>R$ {savings.toFixed(2).replace('.', ',')}</strong> com o Clube!
              </div>
            )}

            <div className="cart-total" style={{ marginBottom: '1rem' }}>
              <span>Total Estimado</span>
              <span style={{ color: 'var(--primary-color)' }}>R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
            {total < 100 && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center', backgroundColor: '#fef2f2', padding: '0.5rem', borderRadius: '4px' }}>
                Faltam <strong>R$ {(100 - total).toFixed(2).replace('.', ',')}</strong> para atingir o pedido mínimo de R$ 100,00.
              </div>
            )}
            <button 
              className="btn btn-primary btn-checkout" 
              onClick={handleCheckout} 
              disabled={total < 100}
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', opacity: total < 100 ? 0.5 : 1, cursor: total < 100 ? 'not-allowed' : 'pointer' }}
            >
              {total >= 100 ? 'Concluir no WhatsApp' : 'Pedido Mínimo Não Atingido'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
