const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const supabase = null; // Desativado
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

// 2. Disco para Imagens de Produtos (Vercel usa /tmp por ser read-only)
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;
const uploadDir = isVercel ? '/tmp' : path.join(__dirname, 'uploads');

try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
} catch (err) {
    console.warn('Alerta: Não foi possível criar pasta de uploads:', err.message);
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

// 1. GET - Buscar produtos (SQLite)
app.get('/api/products', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 50;
    if (limit > 100) limit = 100;
    
    const categoryQuery = req.query.category || '';
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    // Adiciona filtro para não exibir produtos com preço zerado ou estoque zerado
    let countQuery = 'SELECT COUNT(*) as count FROM products WHERE price > 0 AND stock > 0';
    let dataQuery = 'SELECT * FROM products WHERE price > 0 AND stock > 0';
    let params = [];

    if (search) {
        const searchFilter = ' AND (name LIKE ? OR barcode LIKE ? OR brand LIKE ?)';
        countQuery += searchFilter;
        dataQuery += searchFilter;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (categoryQuery) {
        countQuery += ' AND category = ?';
        dataQuery += ' AND category = ?';
        params.push(categoryQuery);
    }

    dataQuery += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    let dataParams = [...params, limit, offset];

    db.get(countQuery, params, (err, countRow) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all(dataQuery, dataParams, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            // Buscar Categorias Únicas
            db.all('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != "" AND price > 0 AND stock > 0', [], (err, catRows) => {
                const categories = catRows ? catRows.map(c => c.category) : [];
                
                res.json({ 
                    message: 'success', 
                    data: rows, 
                    total: countRow.count,
                    categories: categories,
                    page,
                    limit
                });
            });
        });
    });
});

// 2. POST - Adicionar via ERP comum (SQLite)
app.post('/api/products', (req, res) => {
    const { name, brand, price, club_price, unit, image, barcode, category, stock } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Nome e preço são obrigatórios' });

    const sql = 'INSERT INTO products (name, brand, price, club_price, unit, image, barcode, category, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const params = [name, brand, price, club_price || null, unit, image, barcode, category, stock || 0];

    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Produto adicionado com sucesso', id: this.lastID });
    });
});

// 3. POST - Upload Inteligente de Excel (SQLite)
app.post('/api/upload-excel', memoryUpload.single('excel_file'), (req, res) => {
    console.log('--- Requisição de Upload Recebida ---');
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null });

        let nameIdx = -1, barcodeIdx = -1, priceIdx = -1, categoryIdx = -1, stockIdx = -1;

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

        if (nameIdx === -1) { nameIdx = 1; barcodeIdx = 0; }

        const productsToInsert = [];
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row || !row[nameIdx] || String(row[nameIdx]).toLowerCase().includes('descrição')) continue;

            const name = String(row[nameIdx]).trim();
            const barcode = barcodeIdx !== -1 ? (row[barcodeIdx] ? String(row[barcodeIdx]).trim() : '') : '';
            const priceStr = priceIdx !== -1 ? row[priceIdx] : 0;
            const price = parseFloat(String(priceStr).replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
            const category = categoryIdx !== -1 ? (row[categoryIdx] || '') : '';
            const stock = stockIdx !== -1 ? (parseInt(row[stockIdx]) || 0) : 0;
            
            productsToInsert.push([name, '', price, null, 'un', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80', barcode, category, stock]);
        }

        const sql = 'INSERT INTO products (name, brand, price, club_price, unit, image, barcode, category, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.serialize(() => {
            const stmt = db.prepare(sql);
            for (const p of productsToInsert) {
                stmt.run(p);
            }
            stmt.finalize((err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: `Planilha processada com sucesso! ${productsToInsert.length} produtos importados.` });
            });
        });
    } catch (error) {
         console.error('Erro crítico importação:', error);
         res.status(500).json({ error: 'Erro ao processar as linhas do arquivo Excel.', details: error.message });
    }
});

// 4. POST - Upload de imagem para um produto específico (SQLite)
app.post('/api/products/:id/image', diskUpload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum imagem enviada.' });
    
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['host'];
    const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    const productId = req.params.id;

    db.run('UPDATE products SET image = ? WHERE id = ?', [imageUrl, productId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Imagem atualizada com sucesso!', imageUrl });
    });
});

// NEW: 5. POST - Sincronização automática via Código de Barras
// --- INTEGRAÇÃO SIMPLUS API V4 ---
let simplusToken = null;
let tokenExpiry = null;

async function getSimplusToken() {
    const email = process.env.SIMPLUS_EMAIL;
    const password = process.env.SIMPLUS_PASSWORD;
    
    if (!email || !password) {
        console.warn('Simplus: Credenciais não configuradas (SIMPLUS_EMAIL/SIMPLUS_PASSWORD)');
        return null;
    }

    // Se tiver token válido por mais 5 min, usa ele
    if (simplusToken && tokenExpiry > Date.now() + 300000) return simplusToken;

    try {
        console.log('Simplus: Autenticando...');
        const res = await axios.post('https://prod-api-v4.simplustec.com.br/jwt-login', { email, password }, { timeout: 5000 });
        if (res.data && res.data.token) {
            simplusToken = res.data.token;
            tokenExpiry = Date.now() + 3600000; // Assume 1h de validade
            return simplusToken;
        }
    } catch (err) {
        console.error('Simplus: Erro no login:', err.message);
    }
    return null;
}

app.post('/api/products/:id/auto-sync-image', async (req, res) => {
    const productId = req.params.id;
    db.get('SELECT barcode, name FROM products WHERE id = ?', [productId], async (err, product) => {
        if (err || !product) return res.status(404).json({ error: 'Produto não encontrado' });
        
        const barcode = product.barcode;
        if (!barcode || barcode === 'N/A' || barcode === '0000000') {
            return res.status(400).json({ error: 'Código de barras inválido ou ausente para sincronização.' });
        }

        try {
            console.log(`Tentando sincronizar: ${product.name} (${barcode})`);
            let imageUrl = null;

            // 1. TENTATIVA: SIMPLUS API V4 (Premium Brasil)
            const token = await getSimplusToken();
            if (token) {
                try {
                    console.log('Consultando Simplus...');
                    const simplusRes = await axios.get(`https://prod-api-v4.simplustec.com.br/product?gtin=${barcode}`, {
                        headers: { 'Authorization': `Bearer ${token}`, 'locale': 'pt_BR' },
                        timeout: 5000
                    });
                    
                    // Simplus retorna os dados do produto. Procuramos por imagens.
                    if (simplusRes.data && simplusRes.data.assets && simplusRes.data.assets.length > 0) {
                        // Filtra por imagens (assetType ou similar se existir, senão pega a primeira)
                        const images = simplusRes.data.assets.filter(a => a.assetType === 'IMAGE' || a.mimeType?.includes('image'));
                        if (images.length > 0) {
                            imageUrl = images[0].url;
                            console.log('Foto encontrada na Simplus!');
                        }
                    }
                } catch (err) {
                    console.log('Simplus: Produto não encontrado ou erro na API.', err.message);
                }
            }

            // 2. TENTATIVA: Ean Pictures (Brasil) - Fallback
            if (!imageUrl) {
                try {
                    console.log('Consultando Ean Pictures (Brasil)...');
                    const eanRes = await axios.get(`http://www.eanpictures.com.br:9000/api/gtin/${barcode}`, { timeout: 4000 });
                    if (eanRes.data) {
                        const data = eanRes.data;
                        if (Array.isArray(data) && data.length > 0) imageUrl = data[0].thumbnail || data[0].url || data[0].image;
                        else if (data.thumbnail || data.url || data.image) imageUrl = data.thumbnail || data.url || data.image;
                    }
                } catch (err) {
                    console.log('Ean Pictures falhou.');
                }
            }

            // 3. TENTATIVA: Open Food Facts (Mundial) - Fallback final
            if (!imageUrl) {
                try {
                    console.log('Consultando Open Food Facts...');
                    const offRes = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, { timeout: 4000 });
                    if (offRes.data && offRes.data.status === 1) {
                        imageUrl = offRes.data.product.image_url || offRes.data.product.image_front_url;
                    }
                } catch (err) {
                    console.log('Open Food Facts falhou.');
                }
            }

            if (imageUrl) {
                db.run('UPDATE products SET image = ? WHERE id = ?', [imageUrl, productId], function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    return res.json({ success: true, imageUrl, message: 'Foto sincronizada com sucesso!' });
                });
            } else {
                return res.status(404).json({ error: 'Nenhuma foto encontrada nas bases Simplus, Ean Pictures ou OFF.' });
            }
        } catch (error) {
            console.error('Erro geral sincronização:', error.message);
            return res.status(500).json({ error: 'Erro de conexão: ' + error.message });
        }
    });
});

// DELETE (SQLite)
app.delete('/api/products/:id', (req, res) => {
    db.run('DELETE FROM products WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Produto deletado' });
    });
});

// UPDATE PRODUTO (SQLite)
app.put('/api/products/:id', (req, res) => {
    const { name, brand, price, club_price, unit, image, barcode, category, stock } = req.body;
    
    const fields = [];
    const params = [];

    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (brand !== undefined) { fields.push('brand = ?'); params.push(brand); }
    if (price !== undefined) { fields.push('price = ?'); params.push(price); }
    if (club_price !== undefined) { fields.push('club_price = ?'); params.push(club_price === "" ? null : club_price); }
    if (unit !== undefined) { fields.push('unit = ?'); params.push(unit); }
    if (image !== undefined) { fields.push('image = ?'); params.push(image); }
    if (barcode !== undefined) { fields.push('barcode = ?'); params.push(barcode); }
    if (category !== undefined) { fields.push('category = ?'); params.push(category); }
    if (stock !== undefined) { fields.push('stock = ?'); params.push(stock); }

    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    params.push(req.params.id);
    const sql = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;

    db.run(sql, params, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Produto atualizado com sucesso!' });
    });
});

// LOGIN ADMIN (SQLite)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        res.json({ success: true, message: 'Autenticado' });
    });
});

// --- METRICAS & DASHBOARD ---

// 1. Gravar Métrica (SQLite)
app.post('/api/metrics', (req, res) => {
    const { event_type, product_id, product_name } = req.body;
    if (!event_type) return res.status(400).json({ error: 'Tipo de evento obrigatório' });

    db.run('INSERT INTO metrics (event_type, product_id, product_name) VALUES (?, ?, ?)', [event_type, product_id || null, product_name || null], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Métrica registrada' });
    });
});

// 2. Resumo de Métricas (SQLite)
app.get('/api/metrics/summary', (req, res) => {
    db.get('SELECT COUNT(*) as totalCheckouts FROM metrics WHERE event_type = "whatsapp_checkout"', (err, checkoutRow) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all('SELECT product_name, COUNT(*) as count FROM metrics WHERE event_type = "add_to_cart" GROUP BY product_name ORDER BY count DESC LIMIT 5', (err, topProducts) => {
            if (err) return res.status(500).json({ error: err.message });

            db.all('SELECT p.category, COUNT(*) as count FROM metrics m JOIN products p ON m.product_id = p.id GROUP BY p.category ORDER BY count DESC', (err, categoryClicks) => {
                if (err) return res.status(500).json({ error: err.message });

                res.json({
                    totalCheckouts: checkoutRow.totalCheckouts,
                    topProducts,
                    categoryClicks
                });
            });
        });
    });
});

// --- GESTÃO DE MEMBROS DO CLUBE (SQLite) ---

app.get('/api/members', (req, res) => {
    db.all('SELECT * FROM club_members ORDER BY created_at DESC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows });
    });
});

app.post('/api/members', (req, res) => {
    const { cpf, name, birth_date, address, phone, preferred_store } = req.body;
    if (!cpf || !name) return res.status(400).json({ error: 'CPF e Nome são obrigatórios' });

    const sql = 'INSERT INTO club_members (cpf, name, birth_date, address, phone, preferred_store) VALUES (?, ?, ?, ?, ?, ?)';
    const params = [cpf, name, birth_date, address, phone, preferred_store];

    db.run(sql, params, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Este CPF já está cadastrado no Clube.' });
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Bem-vindo ao Clube! Cadastro realizado com sucesso.', id: this.lastID });
    });
});

app.delete('/api/members/:id', (req, res) => {
    db.run('DELETE FROM club_members WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Membro removido com sucesso!' });
    });
});

app.post('/api/members/validate', (req, res) => {
    const { cpf } = req.body;
    if (!cpf) return res.status(400).json({ error: 'CPF não informado' });

    const cleanCpf = cpf.replace(/\D/g, '');
    
    db.all('SELECT * FROM club_members', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const member = rows.find(m => m.cpf.replace(/\D/g, '') === cleanCpf);
        
        if (member) {
            res.json({ success: true, member });
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

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}
