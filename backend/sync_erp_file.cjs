const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const supabase = require('./supabase.cjs');

const excelPath = path.resolve(__dirname, '../exportEstoque.xlsx');

async function syncErp() {
    console.log('--- Iniciando Sincronização ERP -> Supabase ---');
    
    if (!fs.existsSync(excelPath)) {
        console.error('ERRO: Arquivo exportEstoque.xlsx não encontrado na raiz.');
        process.exit(1);
    }

    console.log('Lendo planilha...');
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    const productRows = data.slice(13); 

    console.log('Limpando base de dados no Supabase...');
    const { error: deleteError } = await supabase.from('products').delete().neq('id', 0);
    if (deleteError) {
        console.error('Erro ao limpar produtos:', deleteError.message);
        return;
    }

    const productsToInsert = [];
    console.log('Preparando dados...');

    for (const row of productRows) {
        if (!row || row.length < 2 || !row[1]) continue;

        const id = parseInt(row[0]);
        const name = String(row[1]).trim();
        const brand = row[2] ? String(row[2]).trim() : '';
        const unit = row[3] ? String(row[3]).trim() : 'un';
        const barcode = row[4] ? String(row[4]).trim() : '';
        const stock = parseFloat(row[6]) || 0;
        const price = parseFloat(row[8]) || 0;
        const clubPrice = parseFloat(row[9]) || null;
        const category = ''; 
        const image = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80';

        productsToInsert.push({
            id, name, brand, unit, barcode, stock, price, club_price: clubPrice, category, image
        });
    }

    console.log(`Enviando ${productsToInsert.length} produtos para o Supabase...`);
    
    // Inserir em chunks de 500 para não estourar payload
    const chunkSize = 500;
    for (let i = 0; i < productsToInsert.length; i += chunkSize) {
        const chunk = productsToInsert.slice(i, i + chunkSize);
        const { error: insertError } = await supabase.from('products').insert(chunk);
        if (insertError) {
            console.error(`Erro inserindo chunk ${i}:`, insertError.message);
        } else {
            console.log(`Processado: ${i + chunk.length}/${productsToInsert.length}`);
        }
    }

    console.log(`--- Sincronização Finalizada! ---`);
}

syncErp().catch(err => {
    console.error('Erro crítico na sincronização:', err);
});

syncErp().catch(err => {
    console.error('Erro crítico na sincronização:', err);
});
