const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('./database.cjs');

const app = express();
const PORT = 3001;

// Middleware para LOG de requisições
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Configuração do Multer
// 1. Memória para leitura de arquivos (Limite de 50MB para planilhas gigantes)
const memoryUpload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } 
});

// 2. Disco para Imagens de Produtos
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const diskUpload = multer({ storage: storage });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(uploadDir));

// 1. GET - Buscar produtos (Com Paginação Forçada e Busca)
app.get('/api/products', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 50; // Default 50
    if (limit > 100) limit = 100; // Segurança Máxima: Nunca mais de 100
    
    const category = req.query.category || '';
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM products';
    let countQuery = 'SELECT COUNT(*) as total FROM products';
    let categoryQuery = 'SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ""';
    let params = [];
    let countParams = [];
    let filters = [];

    if (search) {
        filters.push(`(name LIKE ? OR barcode LIKE ? OR brand LIKE ?)`);
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam);
        countParams.push(searchParam, searchParam, searchParam);
    }

    if (category) {
        filters.push(`category = ?`);
        params.push(category);
        countParams.push(category);
    }

    if (filters.length > 0) {
        const filterStr = ' WHERE ' + filters.join(' AND ');
        query += filterStr;
        countQuery += filterStr;
    }

    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Executar Queries
    db.get(countQuery, countParams, (err, countRow) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Buscar Categorias para o menu (Pode ser cacheado no futuro)
            db.all(categoryQuery, [], (err, catRows) => {
                const categories = catRows ? catRows.map(c => c.category) : [];
                res.json({ 
                    message: 'success', 
                    data: rows, 
                    total: countRow.total,
                    categories: categories,
                    page,
                    limit
                });
            });
        });
    });
});

// 2. POST - Adicionar via ERP comum
app.post('/api/products', (req, res) => {
    const { name, brand, price, club_price, unit, image, barcode, category, stock } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Nome e preço são obrigatórios' });

    const sql = 'INSERT INTO products (name, brand, price, club_price, unit, image, barcode, category, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
    db.run(sql, [name, brand, price, club_price || null, unit, image, barcode, category, stock || 0], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Produto adicionado com sucesso', data: { id: this.lastID, name } });
    });
});

// 3. POST - Upload Inteligente de Excel (Otimizado para Massa)
app.post('/api/upload-excel', memoryUpload.single('excel_file'), async (req, res) => {
    console.log('--- Requisição de Upload Recebida ---');
    if (!req.file) {
        console.error('Erro: Nenhum arquivo na requisição.');
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    console.log(`Arquivo recebido: ${req.file.originalname} (${req.file.size} bytes)`);

    try {
        console.log('Lendo buffer com XLSX...');
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null });

        let successCount = 0;
        let nameIdx = -1, barcodeIdx = -1, priceIdx = -1, categoryIdx = -1, stockIdx = -1;

        // 1. Identificar Cabeçalhos
        for (let j = 0; j < Math.min(data.length, 20); j++) {
            const row = data[j];
            if (!Array.isArray(row)) continue;
            for (let i = 0; i < row.length; i++) {
                const cellStr = String(row[i]).toLowerCase();
                if (cellStr.includes('descrição') || cellStr.includes('descricao') || cellStr === 'nome' || cellStr.includes('produto')) nameIdx = i;
                if (cellStr.includes('cód barras') || cellStr.includes('cod barras') || cellStr.includes('codigo') || cellStr.includes('ean')) barcodeIdx = i;
                if (cellStr.includes('preço') || cellStr.includes('preco') || cellStr.includes('valor')) priceIdx = i;
                if (cellStr.includes('setor') || cellStr.includes('categoria')) categoryIdx = i;
                if (cellStr.includes('estoque') || cellStr.includes('qtd') || cellStr.includes('quantidade')) stockIdx = i;
            }
            if (nameIdx !== -1) break;
        }

        if (nameIdx === -1) {
            nameIdx = 1; // Fallback comum
            barcodeIdx = 0;
        }

        console.log(`Iniciando importação de ${data.length} linhas...`);

        // 2. Inserção em Massa via Transação (Turbo Mode)
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            const stmt = db.prepare('INSERT INTO products (name, brand, price, club_price, unit, image, barcode, category, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                if (!row || !row[nameIdx] || String(row[nameIdx]).toLowerCase().includes('descrição')) continue;

                const name = String(row[nameIdx]).trim();
                const barcode = barcodeIdx !== -1 ? (row[barcodeIdx] ? String(row[barcodeIdx]).trim() : '') : '';
                const priceStr = priceIdx !== -1 ? row[priceIdx] : 0;
                const price = parseFloat(String(priceStr).replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
                const category = categoryIdx !== -1 ? (row[categoryIdx] || '') : '';
                const stock = stockIdx !== -1 ? (parseInt(row[stockIdx]) || 0) : 0;
                const imageUrl = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80'; // Placeholder rápido

                stmt.run([name, '', price, null, 'un', imageUrl, barcode, category, stock], (err) => {
                    if (!err) successCount++;
                });
            }

            stmt.finalize();
            db.run("COMMIT", (err) => {
                if (err) {
                    console.error('Erro ao commitar transação:', err);
                    return res.status(500).json({ error: 'Erro ao salvar no banco.' });
                }
                console.log(`Sucesso! ${successCount} produtos importados.`);
                res.json({
                    message: `Planilha processada com sucesso! ${successCount} produtos importados em tempo recorde.`,
                    count: successCount
                });
            });
        });
        
    } catch (error) {
         console.error('Erro crítico importação:', error);
         res.status(500).json({ error: 'Erro ao processar as linhas do arquivo Excel.', details: error.message });
    }
});

// NEW: 4. POST - Upload de imagem para um produto específico
app.post('/api/products/:id/image', diskUpload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    
    const imageUrl = `http://localhost:3001/uploads/${req.file.filename}`;
    const productId = req.params.id;

    db.run('UPDATE products SET image = ? WHERE id = ?', [imageUrl, productId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Imagem atualizada com sucesso!', imageUrl });
    });
});

// NEW: 5. POST - Sincronização automática via Código de Barras
app.post('/api/products/:id/auto-sync-image', async (req, res) => {
    const productId = req.params.id;
    db.get('SELECT barcode, name FROM products WHERE id = ?', [productId], async (err, product) => {
        if (err || !product) return res.status(404).json({ error: 'Produto não encontrado' });
        if (!product.barcode || product.barcode === 'N/A' || product.barcode === '0000000') {
            return res.status(400).json({ error: 'Código de barras inválido ou ausente para sincronização.' });
        }

        try {
            const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${product.barcode}.json`, { timeout: 5000 });
            if (response.data && response.data.status === 1) {
                const imageUrl = response.data.product.image_url || response.data.product.image_front_url;
                if (imageUrl) {
                    db.run('UPDATE products SET image = ? WHERE id = ?', [imageUrl, productId], function(err) {
                        if (err) return res.status(500).json({ error: err.message });
                        return res.json({ success: true, imageUrl, message: 'Foto sincronizada com sucesso!' });
                    });
                } else {
                    return res.status(404).json({ error: 'Foto não encontrada na base online para este EAN.' });
                }
            } else {
                return res.status(404).json({ error: 'Produto não localizado no Open Food Facts.' });
            }
        } catch (error) {
            return res.status(500).json({ error: 'Erro de conexão com API: ' + error.message });
        }
    });
});

// DELETE
app.delete('/api/products/:id', (req, res) => {
    db.run('DELETE FROM products WHERE id = ?', req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Produto deletado', changes: this.changes });
    });
});

// UPDATE PRODUTO (COMPLETO OU PARCIAL)
app.put('/api/products/:id', (req, res) => {
    const { name, brand, price, club_price, unit, image, barcode, category, stock } = req.body;
    
    // Debug Log para rastrear problemas de salvamento
    console.log(`Atualizando produto ${req.params.id}:`, { name, price, club_price, stock });

    const sql = `
        UPDATE products SET 
            name = COALESCE(?, name), 
            brand = COALESCE(?, brand), 
            price = COALESCE(?, price), 
            club_price = ?,
            unit = COALESCE(?, unit), 
            image = COALESCE(?, image), 
            barcode = COALESCE(?, barcode), 
            category = COALESCE(?, category), 
            stock = COALESCE(?, stock) 
        WHERE id = ?`;
    
    // Explicitamente converter undefined para null para o sqlite3 COALESCE
    const params = [
        name !== undefined ? name : null, 
        brand !== undefined ? brand : null, 
        price !== undefined ? price : null, 
        club_price !== undefined ? (club_price === "" ? null : club_price) : null,
        unit !== undefined ? unit : null, 
        image !== undefined ? image : null, 
        barcode !== undefined ? barcode : null, 
        category !== undefined ? category : null, 
        stock !== undefined ? stock : null, 
        req.params.id
    ];

    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Produto atualizado com sucesso!', changes: this.changes });
    });
});

// LOGIN ADMIN
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            res.json({ success: true, message: 'Autenticado' });
        } else {
            res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }
    });
});

// --- METRICAS & DASHBOARD (Ideia 2) ---

// 1. Gravar Métrica
app.post('/api/metrics', (req, res) => {
    const { event_type, product_id, product_name } = req.body;
    if (!event_type) return res.status(400).json({ error: 'Tipo de evento obrigatório' });

    db.run('INSERT INTO metrics (event_type, product_id, product_name) VALUES (?, ?, ?)', 
        [event_type, product_id || null, product_name || null], 
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Métrica registrada' });
        }
    );
});

// 2. Resumo de Métricas para o Dashboard
app.get('/api/metrics/summary', (req, res) => {
    // Total de Checkouts (WhatsApp)
    const checkoutsQuery = "SELECT COUNT(*) as total FROM metrics WHERE event_type = 'whatsapp_checkout'";
    
    // Top Produtos Adicionados ao Carrinho
    const topProductsQuery = `
        SELECT product_name, COUNT(*) as count 
        FROM metrics 
        WHERE event_type = 'add_to_cart' 
        GROUP BY product_name 
        ORDER BY count DESC 
        LIMIT 5`;

    // Estatísticas por Categoria (Interação)
    const categoryQuery = `
        SELECT p.category, COUNT(m.id) as count 
        FROM metrics m 
        JOIN products p ON m.product_id = p.id 
        GROUP BY p.category 
        ORDER BY count DESC`;

    db.get(checkoutsQuery, (err, checkouts) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all(topProductsQuery, (err, products) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.all(categoryQuery, (err, categories) => {
                if (err) return res.status(500).json({ error: err.message });
                
                res.json({
                    totalCheckouts: checkouts.total,
                    topProducts: products,
                    categoryClicks: categories
                });
            });
        });
    });
});

// --- GESTÃO DE MEMBROS DO CLUBE ---

// 1. Listar todos os membros (Admin)
app.get('/api/members', (req, res) => {
    db.all('SELECT * FROM club_members ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows });
    });
});

// 2. Adicionar novo membro (Público ou Admin)
app.post('/api/members', (req, res) => {
    const { cpf, name, birth_date, address, phone, preferred_store } = req.body;
    if (!cpf || !name) return res.status(400).json({ error: 'CPF e Nome são obrigatórios' });

    const sql = `INSERT INTO club_members (cpf, name, birth_date, address, phone, preferred_store) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [cpf, name, birth_date, address, phone, preferred_store], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Este CPF já está cadastrado no Clube.' });
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Bem-vindo ao Clube Arapongas! Cadastro realizado com sucesso.', id: this.lastID });
    });
});

// 3. Deletar membro (Admin)
app.delete('/api/members/:id', (req, res) => {
    db.run('DELETE FROM club_members WHERE id = ?', req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Membro removido com sucesso!' });
    });
});

// 4. VALIDAR CPF (Carrinho)
app.post('/api/members/validate', (req, res) => {
    const { cpf } = req.body;
    if (!cpf) return res.status(400).json({ error: 'CPF não informado' });

    // Limpar o CPF para busca (remover pontos e traço se vierem na máscara)
    const cleanCpf = cpf.replace(/\D/g, '');
    
    // Busca flexível: encontra se o banco tem com pontos ou sem pontos
    db.get('SELECT * FROM club_members WHERE REPLACE(REPLACE(cpf, ".", ""), "-", "") = ?', [cleanCpf], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            res.json({ success: true, member: row });
        } else {
            res.json({ success: false, message: 'CPF não localizado no Clube Arapongas.' });
        }
    });
});

// --- FIM GESTÃO DE MEMBROS ---

// --- FIM METRICAS ---

// Rota Fallback para 404 em JSON
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada no servidor backend.' });
});

// Tratamento de Erros Global em JSON
app.use((err, req, res, next) => {
    console.error('ERRO GLOBAL:', err.stack);
    res.status(500).json({ error: 'Erro interno no servidor', details: err.message });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
