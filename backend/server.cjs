const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const supabase = require('./supabase.cjs');

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
app.get('/api/products', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 50;
    if (limit > 100) limit = 100;
    
    const categoryQuery = req.query.category || '';
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    try {
        let query = supabase.from('products').select('*', { count: 'exact' });

        if (search) {
            query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%,brand.ilike.%${search}%`);
        }

        if (categoryQuery) {
            query = query.eq('category', categoryQuery);
        }

        const { data, count, error } = await query
            .order('id', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        // Buscar Categorias Únicas
        const { data: catData, error: catError } = await supabase
            .from('products')
            .select('category')
            .not('category', 'is', null)
            .neq('category', '');
        
        if (catError) throw catError;
        
        const categories = [...new Set(catData.map(c => c.category))];

        res.json({ 
            message: 'success', 
            data: data, 
            total: count,
            categories: categories,
            page,
            limit
        });
    } catch (err) {
        console.error('Erro ao buscar produtos:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. POST - Adicionar via ERP comum
app.post('/api/products', async (req, res) => {
    const { name, brand, price, club_price, unit, image, barcode, category, stock } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Nome e preço são obrigatórios' });

    try {
        const { data, error } = await supabase
            .from('products')
            .insert([{ name, brand, price, club_price: club_price || null, unit, image, barcode, category, stock: stock || 0 }])
            .select();

        if (error) throw error;
        res.json({ message: 'Produto adicionado com sucesso', data: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. POST - Upload Inteligente de Excel (Otimizado para Massa)
app.post('/api/upload-excel', memoryUpload.single('excel_file'), async (req, res) => {
    console.log('--- Requisição de Upload Recebida ---');
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null });

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
            
            productsToInsert.push({
                name,
                brand: '',
                price,
                club_price: null,
                unit: 'un',
                image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
                barcode,
                category,
                stock
            });
        }

        // Inserção em Massa no Supabase (Otimizado)
        // Dividir em chunks se necessário (Supabase aguenta bem até uns milhares, mas por segurança...)
        const { error } = await supabase.from('products').insert(productsToInsert);
        if (error) throw error;

        res.json({ message: `Planilha processada com sucesso! ${productsToInsert.length} produtos importados.` });
    } catch (error) {
         console.error('Erro crítico importação:', error);
         res.status(500).json({ error: 'Erro ao processar as linhas do arquivo Excel.', details: error.message });
    }
});

// 4. POST - Upload de imagem para um produto específico
app.post('/api/products/:id/image', diskUpload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['host'];
    const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    const productId = req.params.id;

    try {
        const { error } = await supabase
            .from('products')
            .update({ image: imageUrl })
            .eq('id', productId);

        if (error) throw error;
        res.json({ message: 'Imagem atualizada com sucesso!', imageUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

// DELETE
app.delete('/api/products/:id', async (req, res) => {
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Produto deletado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE PRODUTO (COMPLETO OU PARCIAL)
app.put('/api/products/:id', async (req, res) => {
    const { name, brand, price, club_price, unit, image, barcode, category, stock } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (brand !== undefined) updateData.brand = brand;
    if (price !== undefined) updateData.price = price;
    if (club_price !== undefined) updateData.club_price = club_price === "" ? null : club_price;
    if (unit !== undefined) updateData.unit = unit;
    if (image !== undefined) updateData.image = image;
    if (barcode !== undefined) updateData.barcode = barcode;
    if (category !== undefined) updateData.category = category;
    if (stock !== undefined) updateData.stock = stock;

    try {
        const { error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Produto atualizado com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// LOGIN ADMIN
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (error || !data) {
            return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }
        res.json({ success: true, message: 'Autenticado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- METRICAS & DASHBOARD ---

// 1. Gravar Métrica
app.post('/api/metrics', async (req, res) => {
    const { event_type, product_id, product_name } = req.body;
    if (!event_type) return res.status(400).json({ error: 'Tipo de evento obrigatório' });

    try {
        const { error } = await supabase
            .from('metrics')
            .insert([{ event_type, product_id: product_id || null, product_name: product_name || null }]);

        if (error) throw error;
        res.json({ message: 'Métrica registrada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Resumo de Métricas para o Dashboard
app.get('/api/metrics/summary', async (req, res) => {
    try {
        // Total de Checkouts
        const { count: totalCheckouts, error: err1 } = await supabase
            .from('metrics')
            .select('*', { count: 'exact', head: true })
            .eq('event_type', 'whatsapp_checkout');

        if (err1) throw err1;

        // Top Produtos
        const { data: topProducts, error: err2 } = await supabase
            .rpc('get_top_products'); // Necessita de função RPC no Supabase (ou processar manualmente)

        // Alternativa: Processamento manual (Simples para pequenos volumes)
        const { data: allMetrics, error: err3 } = await supabase
            .from('metrics')
            .select('product_name')
            .eq('event_type', 'add_to_cart');
        
        if (err3) throw err3;

        const productCounts = allMetrics.reduce((acc, current) => {
            acc[current.product_name] = (acc[current.product_name] || 0) + 1;
            return acc;
        }, {});

        const sortedProducts = Object.entries(productCounts)
            .map(([product_name, count]) => ({ product_name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Engajamento por Setor
        const { data: metricsWithProducts, error: err4 } = await supabase
            .from('metrics')
            .select('product_id, products(category)')
            .not('product_id', 'is', null);

        if (err4) throw err4;

        const categoryCounts = metricsWithProducts.reduce((acc, current) => {
            const cat = current.products?.category || 'Geral';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {});

        const sortedCategories = Object.entries(categoryCounts)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count);

        res.json({
            totalCheckouts,
            topProducts: sortedProducts,
            categoryClicks: sortedCategories
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- GESTÃO DE MEMBROS DO CLUBE ---

app.get('/api/members', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('club_members')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ message: 'success', data: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/members', async (req, res) => {
    const { cpf, name, birth_date, address, phone, preferred_store } = req.body;
    if (!cpf || !name) return res.status(400).json({ error: 'CPF e Nome são obrigatórios' });

    try {
        const { data, error } = await supabase
            .from('club_members')
            .insert([{ cpf, name, birth_date, address, phone, preferred_store }])
            .select();

        if (error) {
            if (error.code === '23505') return res.status(400).json({ error: 'Este CPF já está cadastrado no Clube.' });
            throw error;
        }
        res.json({ message: 'Bem-vindo ao Clube! Cadastro realizado com sucesso.', id: data[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/members/:id', async (req, res) => {
    try {
        const { error } = await supabase
            .from('club_members')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Membro removido com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/members/validate', async (req, res) => {
    const { cpf } = req.body;
    if (!cpf) return res.status(400).json({ error: 'CPF não informado' });

    const cleanCpf = cpf.replace(/\D/g, '');
    
    try {
        // Nota: O Supabase não tem REPLACE nativo na query sintaxe básica, 
        // mas podemos usar .or ou processar no DB se necessário.
        // Para simplificar, buscamos todos os membros e filtramos (se volume for pequeno)
        // Ou implementamos um filtro ILIKE.
        const { data, error } = await supabase
            .from('club_members')
            .select('*');
        
        if (error) throw error;

        const member = data.find(m => m.cpf.replace(/\D/g, '') === cleanCpf);
        
        if (member) {
            res.json({ success: true, member });
        } else {
            res.json({ success: false, message: 'CPF não localizado no Clube Arapongas.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
