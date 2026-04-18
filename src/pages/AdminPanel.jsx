import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  LogOut,
  Package,
  ExternalLink,
  Save,
  Download,
  Trash,
  Plus,
  Image as ImageIcon,
  RefreshCw,
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Users,
  UserPlus
} from "lucide-react";
import * as xlsx from "xlsx";

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem("arapongas_admin") === "true",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editPrices, setEditPrices] = useState({});
  const [editClubPrices, setEditClubPrices] = useState({});
  const [editStocks, setEditStocks] = useState({});
  const [editNames, setEditNames] = useState({});
  const [excelFile, setExcelFile] = useState(null);
  const [activeTab, setActiveTab] = useState("catalogo"); // "catalogo", "dashboard", "clube"
  const [summary, setSummary] = useState(null);
  const [members, setMembers] = useState([]);
  const [newMember, setNewMember] = useState({ cpf: '', name: '' });
  
  // Estados de Paginação e Busca Admin
  const [adminPage, setAdminPage] = useState(1);
  const [adminSearch, setAdminSearch] = useState("");
  const [totalProducts, setTotalProducts] = useState(0);
  const adminLimit = 50;

  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      loadProducts(adminPage, adminSearch);
      loadSummary();
      loadMembers();
    }
  }, [isAuthenticated, adminPage]); // Recarregar ao mudar de página

  // Trigger de busca com debounce simples ou manual
  const handleAdminSearch = () => {
    setAdminPage(1);
    loadProducts(1, adminSearch);
  };

  const loadMembers = () => {
    fetch("/api/members")
      .then(res => res.json())
      .then(data => setMembers(data.data || []))
      .catch(err => console.error("Erro ao carregar membros:", err));
  };

  const handleAddMember = () => {
    if (!newMember.cpf || !newMember.name) return;
    fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMember)
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) alert(data.error);
      else {
        setNewMember({ cpf: '', name: '' });
        loadMembers();
      }
    });
  };

  const handleDeleteMember = (id) => {
    if (!window.confirm("Remover este membro do Clube?")) return;
    fetch(`/api/members/${id}`, { method: "DELETE" })
    .then(() => loadMembers());
  };

  const loadSummary = () => {
    fetch("/api/metrics/summary")
      .then(res => res.json())
      .then(data => setSummary(data))
      .catch(err => console.error("Erro ao carregar dashboard:", err));
  };

  const loadProducts = (page = adminPage, search = adminSearch) => {
    setLoading(true);
    fetch(`/api/products?page=${page}&limit=${adminLimit}&search=${search}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.message === "success") {
          setProducts(data.data);
          setTotalProducts(data.total || data.data.length);
          
          // Preparar estado de edição APENAS para os itens visíveis (Otimização Máxima)
          setEditPrices(prev => {
            const next = { ...prev };
            data.data.forEach(p => { if (next[p.id] === undefined) next[p.id] = p.price; });
            return next;
          });
          setEditClubPrices(prev => {
            const next = { ...prev };
            data.data.forEach(p => { if (next[p.id] === undefined) next[p.id] = p.club_price || ""; });
            return next;
          });
          setEditStocks(prev => {
            const next = { ...prev };
            data.data.forEach(p => { if (next[p.id] === undefined) next[p.id] = p.stock || 0; });
            return next;
          });
          setEditNames(prev => {
            const next = { ...prev };
            data.data.forEach(p => { if (next[p.id] === undefined) next[p.id] = p.name; });
            return next;
          });
        }
      })
      .finally(() => setLoading(false));
  };

  const handleImageUpload = (productId, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);

    setLoading(true);
    fetch(`/api/products/${productId}/image`, {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        alert("Foto atualizada!");
        loadProducts();
      })
      .catch((err) => alert("Erro no upload: " + err.message))
      .finally(() => setLoading(false));
  };

  const handleAutoSync = (productId) => {
    setLoading(true);
    fetch(`/api/products/${productId}/auto-sync-image`, {
      method: "POST",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("Foto sincronizada com sucesso!");
          loadProducts();
        } else {
          alert("Erro: " + (data.error || "Não foi possível encontrar a foto."));
        }
      })
      .catch((err) => alert("Erro na sincronização: " + err.message))
      .finally(() => setLoading(false));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setIsAuthenticated(true);
          localStorage.setItem("arapongas_admin", "true");
        } else {
          alert("Usuário ou senha incorretos.");
        }
      });
  };

  const handleFileUpload = () => {
    if (!excelFile) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("excel_file", excelFile);

    fetch("/api/upload-excel", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        alert(data.message);
        setExcelFile(null); // Limpa o arquivo após sucesso
        loadProducts();
      })
      .catch((err) => alert("Erro na importação: " + err.message))
      .finally(() => setLoading(false));
  };

  const handleSavePrice = (id) => {
    const newPrice = editPrices[id];
    const newClubPrice = editClubPrices[id];
    const newStock = parseInt(editStocks[id]);
    const newName = editNames[id];

    if (isNaN(newStock)) {
      alert("Quantidade de estoque inválida.");
      return;
    }

    fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: newPrice, club_price: newClubPrice, stock: newStock, name: newName }),
    })
      .then((res) => res.json())
      .then((data) => {
        alert("Dados do produto salvos!");
        loadProducts();
      });
  };

  const handleDelete = (id) => {
    if (window.confirm("Certeza que deseja excluir este produto do sistema?")) {
      fetch(`/api/products/${id}`, {
        method: "DELETE",
      })
        .then((res) => res.json())
        .then((data) => {
          loadProducts();
        });
    }
  };

  const handleExportExcel = () => {
    const dataToExport = products.map((p) => ({
      ID: p.id,
      "Cód Barras": p.barcode || "",
      Descrição: p.name,
      Marca: p.brand || "",
      Setor: p.category || "",
      "Preço de Venda": p.price,
    }));

    const worksheet = xlsx.utils.json_to_sheet(dataToExport);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Catálogo");
    xlsx.writeFile(workbook, "catalogo_arapongas.xlsx");
  };

  if (!isAuthenticated) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "var(--primary-color)",
        }}
      >
        <form
          onSubmit={handleLogin}
          style={{
            backgroundColor: "var(--card-bg)",
            padding: "2.5rem",
            borderRadius: "var(--radius-lg)",
            minWidth: "350px",
            textAlign: "center",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <img src="/logo.png" alt="Arapongas" style={{ height: '60px', objectFit: 'contain', marginBottom: '1.5rem' }} />
          <div style={{ marginBottom: "1rem", textAlign: "left" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontSize: "0.9rem",
                color: "var(--text-muted)",
              }}
            >
              Usuário
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
              }}
            />
          </div>
          <div style={{ marginBottom: "2rem", textAlign: "left" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontSize: "0.9rem",
                color: "var(--text-muted)",
              }}
            >
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
              }}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%" }}
          >
            Acessar Painel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "var(--bg-color)", minHeight: "100vh" }}>
      <header
        style={{
          backgroundColor: "var(--primary-color)",
          color: "white",
          padding: "1rem 0",
        }}
      >
        <div className="container flex justify-between items-center">
          <img src="/logo.png" alt="Arapongas" style={{ height: '50px', objectFit: 'contain' }} />
          <div className="flex gap-4">
            <button
              className="flex items-center gap-2"
              style={{ color: "white" }}
              onClick={() => navigate("/")}
            >
              <ExternalLink size={18} /> Ver Loja
            </button>
            <button
              className="flex items-center gap-2"
              style={{ color: "#ef4444" }}
              onClick={() => {
                setIsAuthenticated(false);
                localStorage.removeItem("arapongas_admin");
              }}
            >
              <LogOut size={18} /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: "2rem 1rem" }}>
        {/* Tabs Suaves */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
          <button 
             onClick={() => setActiveTab("catalogo")}
             style={{ 
               padding: '0.5rem 1rem', 
               fontWeight: 'bold', 
               border: 'none', 
               background: 'none', 
               color: activeTab === 'catalogo' ? 'var(--primary-color)' : '#94a3b8',
               borderBottom: activeTab === 'catalogo' ? '3px solid var(--primary-color)' : 'none',
               cursor: 'pointer'
             }}
          >
            📦 Catálogo
          </button>
          <button 
             onClick={() => {
               setActiveTab("dashboard");
               loadSummary();
             }}
             style={{ 
               padding: '0.5rem 1rem', 
               fontWeight: 'bold', 
               border: 'none', 
               background: 'none', 
               color: activeTab === 'dashboard' ? 'var(--primary-color)' : '#94a3b8',
               borderBottom: activeTab === 'dashboard' ? '3px solid var(--primary-color)' : 'none',
               cursor: 'pointer'
             }}
          >
            📊 Dashboard
          </button>
          <button 
             onClick={() => {
               setActiveTab("clube");
               loadMembers();
             }}
             style={{ 
               padding: '0.5rem 1rem', 
               fontWeight: 'bold', 
               border: 'none', 
               background: 'none', 
               color: activeTab === 'clube' ? 'var(--primary-color)' : '#94a3b8',
               borderBottom: activeTab === 'clube' ? '3px solid var(--primary-color)' : 'none',
               cursor: 'pointer'
             }}
          >
            ⭐ Clube Arapongas
          </button>
        </div>

        {activeTab === "dashboard" && (
          <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                   <p style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.9rem' }}>Pedidos Iniciados (WhatsApp)</p>
                   <h2 style={{ margin: 0, fontSize: '2.2rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <TrendingUp /> {summary?.totalCheckouts || 0}
                   </h2>
                </div>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                   <p style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.9rem' }}>Setores com mais Interesse</p>
                   <h2 style={{ margin: 0, fontSize: '2.2rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShoppingBag /> {summary?.categoryClicks?.length || 0}
                   </h2>
                </div>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                   <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--primary-color)' }}>Top 5 Produtos (No Carrinho)</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {summary?.topProducts?.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                           <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.product_name}</span>
                           <span style={{ backgroundColor: 'var(--accent-color)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>{item.count} adições</span>
                        </div>
                      ))}
                      {(!summary?.topProducts || summary.topProducts.length === 0) && <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Aguardando interações dos clientes...</p>}
                   </div>
                </div>

                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                   <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--primary-color)' }}>Engajamento por Setor</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {summary?.categoryClicks?.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                           <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ 
                                 width: `${Math.min(100, (item.count / (summary.totalCheckouts || 1)) * 100)}%`, 
                                 height: '100%', 
                                 backgroundColor: 'var(--primary-color)' 
                              }}></div>
                           </div>
                           <span style={{ minWidth: '120px', fontSize: '0.85rem', fontWeight: 'bold' }}>{item.category || "Geral"}: {item.count}</span>
                        </div>
                      ))}
                      {(!summary?.categoryClicks || summary.categoryClicks.length === 0) && <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Aguardando interações dos clientes...</p>}
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === "clube" && (
          <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={24} /> Cadastrar Novo Membro
              </h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  placeholder="CPF (ex: 123.456.789-01)" 
                  value={newMember.cpf}
                  onChange={e => setNewMember({...newMember, cpf: e.target.value})}
                  style={{ padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', flex: 1, minWidth: '200px' }}
                />
                <input 
                  type="text" 
                  placeholder="Nome Completo do Cliente" 
                  value={newMember.name}
                  onChange={e => setNewMember({...newMember, name: e.target.value})}
                  style={{ padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', flex: 2, minWidth: '300px' }}
                />
                <button 
                  onClick={handleAddMember}
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 2rem' }}
                >
                  Cadastrar no Clube
                </button>
              </div>
            </div>

            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--primary-color)' }}>Membros Cadastrados</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                      <th style={{ padding: '1rem' }}>Nome</th>
                      <th style={{ padding: '1rem' }}>CPF</th>
                      <th style={{ padding: '1rem' }}>Telefone</th>
                      <th style={{ padding: '1rem' }}>Loja</th>
                      <th style={{ padding: '1rem' }}>Data Cadastro</th>
                      <th style={{ padding: '1rem', textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(member => (
                      <tr key={member.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 'bold' }}>{member.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{member.address}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>{member.cpf}</td>
                        <td style={{ padding: '1rem' }}>{member.phone || '-'}</td>
                        <td style={{ padding: '1rem' }}>{member.preferred_store || '-'}</td>
                        <td style={{ padding: '1rem', color: '#64748b' }}>{new Date(member.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <button 
                            onClick={() => handleDeleteMember(member.id)}
                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
                            title="Remover Membro"
                          >
                            <Trash size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {members.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Nenhum membro cadastrado ainda.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "catalogo" && (
          <div style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "1.5rem",
                marginBottom: "2rem",
              }}
            >
          {/* Card Stats */}
          <div
            style={{
              background: "var(--card-bg)",
              padding: "1.5rem",
              borderRadius: "var(--radius-md)",
              borderTop: "4px solid var(--accent-color)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                marginBottom: "0.5rem",
              }}
            >
              Total de Produtos na Plataforma
            </p>
            <h1
              style={{
                color: "var(--primary-color)",
                margin: 0,
                fontSize: "2.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Package size={32} /> {products.length}
            </h1>
          </div>

          {/* Card Upload */}
          <div
            style={{
              background: "var(--card-bg)",
              padding: "1.5rem",
              borderRadius: "var(--radius-md)",
              borderTop: "4px solid var(--primary-color)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                marginBottom: "0.5rem",
              }}
            >
              Carga de Planilha ERP (.xlsx)
            </p>
            <div
              style={{
                marginTop: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.8rem",
              }}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setExcelFile(e.target.files[0])}
                style={{ fontSize: "0.85rem" }}
              />
              <button
                className="btn btn-primary"
                onClick={handleFileUpload}
                disabled={!excelFile || loading}
                style={{ opacity: !excelFile || loading ? 0.5 : 1 }}
              >
                {loading
                  ? "Sincronizando Banco de Dados..."
                  : "Sincronizar Planilha Agora"}
              </button>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                * Suporta arquivos grandes. A busca de fotos é feita depois individualmente.
              </p>
            </div>
          </div>
        </div>

        {/* Gestão de Preços */}
        <div
          style={{
            background: "var(--card-bg)",
            padding: "1.5rem",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            className="flex justify-between items-center"
            style={{ marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}
          >
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h3 style={{ margin: 0, color: "var(--primary-color)" }}>
                Gestão Sincronizada de Catálogo
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total: {totalProducts} produtos</p>
            </div>

            <div style={{ display: "flex", gap: "0.8rem", flexWrap: 'wrap' }}>
              {/* Busca Admin */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="Pesquisar por nome ou código..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminSearch()}
                  style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', minWidth: '250px' }}
                />
                <button className="btn btn-primary" onClick={handleAdminSearch}>Buscar</button>
              </div>

              <button
                className="btn btn-outline flex items-center gap-2"
                onClick={handleExportExcel}
                style={{
                  borderColor: "var(--primary-color)",
                  color: "var(--primary-color)",
                }}
              >
                <Download size={18} /> Exportar
              </button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                textAlign: "left",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                  <th style={{ padding: "1rem 0.5rem" }}>ID</th>
                  <th style={{ padding: "1rem 0.5rem" }}>Produto</th>
                  <th style={{ padding: "1rem 0.5rem" }}>Cód. Barras</th>
                  <th style={{ padding: "1rem 0.5rem" }}>Preço Comum</th>
                  <th style={{ padding: "1rem 0.5rem" }}>Preço Clube</th>
                  <th style={{ padding: "1rem 0.5rem" }}>Estoque</th>
                  <th style={{ padding: "1rem 0.5rem" }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <td
                      style={{
                        padding: "1rem 0.5rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      #{p.id}
                    </td>
                    <td style={{ padding: "1rem 0.5rem", fontWeight: "500" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            width: "40px",
                            height: "40px",
                          }}
                        >
                          <img
                            src={p.image}
                            alt="-"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                              borderRadius: "4px",
                            }}
                          />
                          <label
                            style={{
                              position: "absolute",
                              bottom: "-5px",
                              right: "-5px",
                              background: "var(--primary-color)",
                              color: "white",
                              borderRadius: "50%",
                              width: "20px",
                              height: "20px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              border: "2px solid white",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                            }}
                          >
                            <ImageIcon size={12} />
                            <input
                              type="file"
                              hidden
                              accept="image/*"
                              onChange={(e) =>
                                handleImageUpload(p.id, e.target.files[0])
                              }
                            />
                          </label>
                          <button
                            onClick={() => handleAutoSync(p.id)}
                            title="Sincronizar Foto Online"
                            style={{
                              position: "absolute",
                              top: "-5px",
                              right: "-5px",
                              background: "#3b82f6",
                              color: "white",
                              borderRadius: "50%",
                              width: "20px",
                              height: "20px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              border: "2px solid white",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                            }}
                          >
                            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={
                            editNames[p.id] !== undefined
                              ? editNames[p.id]
                              : p.name
                          }
                          onChange={(e) =>
                            setEditNames((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          style={{
                            padding: "0.4rem",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                            width: "100%",
                            minWidth: "150px",
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: "1rem 0.5rem" }}>
                      {p.barcode || "N/A"}
                    </td>
                    <td style={{ padding: "1rem 0.5rem" }}>
                      <input
                        type="number"
                        step="0.01"
                        value={editPrices[p.id] || ""}
                        onChange={(e) =>
                          setEditPrices((prev) => ({
                            ...prev,
                            [p.id]: parseFloat(e.target.value),
                          }))
                        }
                        style={{
                          padding: "0.5rem",
                          width: "90px",
                          border: "1px solid var(--border-color)",
                          borderRadius: "4px",
                        }}
                      />
                    </td>
                    <td style={{ padding: "1rem 0.5rem" }}>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Vazio"
                        value={editClubPrices[p.id] || ""}
                        onChange={(e) =>
                          setEditClubPrices((prev) => ({
                            ...prev,
                            [p.id]: e.target.value === "" ? "" : parseFloat(e.target.value),
                          }))
                        }
                        style={{
                          padding: "0.5rem",
                          width: "90px",
                          border: "1px solid var(--accent-color)",
                          borderRadius: "4px",
                          backgroundColor: "#fffcf0",
                        }}
                      />
                    </td>
                    <td style={{ padding: "1rem 0.5rem" }}>
                      <input
                        type="number"
                        value={
                          editStocks[p.id] !== undefined
                            ? editStocks[p.id]
                            : p.stock || 0
                        }
                        onChange={(e) =>
                          setEditStocks((prev) => ({
                            ...prev,
                            [p.id]: parseInt(e.target.value) || 0,
                          }))
                        }
                        style={{
                          padding: "0.5rem",
                          width: "70px",
                          border: "1px solid var(--border-color)",
                          borderRadius: "4px",
                        }}
                      />
                    </td>
                    <td style={{ padding: "1rem 0.5rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => handleSavePrice(p.id)}
                          className="flex items-center gap-1"
                          style={{
                            backgroundColor: "var(--accent-color)",
                            color: "black",
                            padding: "0.4rem 0.8rem",
                            borderRadius: "4px",
                            fontWeight: "bold",
                          }}
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="flex items-center gap-1"
                          style={{
                            backgroundColor: "#fef2f2",
                            color: "#ef4444",
                            border: "1px solid #fecaca",
                            padding: "0.4rem 0.8rem",
                            borderRadius: "4px",
                          }}
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação Admin */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2.5rem', padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
             <button 
               className="btn btn-outline" 
               disabled={adminPage === 1 || loading}
               onClick={() => {
                 setAdminPage(prev => prev - 1);
                 window.scrollTo({ top: 300, behavior: 'smooth' });
               }}
               style={{ opacity: adminPage === 1 ? 0.4 : 1, padding: '0.6rem 1.2rem', borderRadius: '30px' }}
             >
               ← Anterior
             </button>
             
             <div style={{ textAlign: 'center' }}>
               <span style={{ fontWeight: '700', color: 'var(--primary-color)' }}>
                 Página {adminPage} de {Math.max(1, Math.ceil(totalProducts / adminLimit))}
               </span>
               <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                 Mostrando {products.length} de {totalProducts} resultados
               </p>
             </div>

             <button 
               className="btn btn-outline" 
               disabled={adminPage >= Math.ceil(totalProducts / adminLimit) || loading}
               onClick={() => {
                 setAdminPage(prev => prev + 1);
                 window.scrollTo({ top: 300, behavior: 'smooth' });
               }}
               style={{ opacity: adminPage >= Math.ceil(totalProducts / adminLimit) ? 0.4 : 1, padding: '0.6rem 1.2rem', borderRadius: '30px' }}
             >
               Próxima →
             </button>
          </div>
        </div>
      </div>
    )}
  </main>
</div>
);
}
