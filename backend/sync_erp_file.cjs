const xlsx = require('xlsx');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const excelPath = path.resolve(__dirname, '../exportEstoque.xlsx');
const dbPath = path.resolve(__dirname, 'produtos.sqlite');

async function syncErp() {
    console.log('--- Iniciando Sincronização ERP via Planilha ---');
    
    if (!fs.existsSync(excelPath)) {
        console.error('ERRO: Arquivo exportEstoque.xlsx não encontrado na raiz.');
        process.exit(1);
    }

    console.log('Lendo planilha...');
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    // Pular cabeçalhos (os dados começam na linha 13, que é índice 12 se contarmos de 0, 
    // ou índice 13 se o scan mostrou 13 como primeiro dado)
    // No scan anterior: row 13 foi [1, "Bebida Lactea ..."]. Então o slice(13) pega do índice 13 em diante.
    const productRows = data.slice(13); 

    const db = new sqlite3.Database(dbPath);

    db.serialize(() => {
        console.log('Limpando base de dados atual...');
        db.run('DELETE FROM products');
        db.run("DELETE FROM sqlite_sequence WHERE name='products'");

        const stmt = db.prepare(`
            INSERT INTO products (id, name, brand, unit, barcode, stock, price, club_price, category, image) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let count = 0;
        console.log('Processando produtos...');

        for (const row of productRows) {
            if (!row || row.length < 2 || !row[1]) continue; // Pula linhas vazias ou sem nome

            const id = parseInt(row[0]);
            const name = String(row[1]).trim();
            const brand = row[2] ? String(row[2]).trim() : '';
            const unit = row[3] ? String(row[3]).trim() : 'un';
            const barcode = row[4] ? String(row[4]).trim() : '';
            const stock = parseFloat(row[6]) || 0;
            const price = parseFloat(row[8]) || 0;
            const clubPrice = parseFloat(row[9]) || null;
            
            // Categoria baseada na marca ou nome (simples fallback)
            const category = ''; 
            const image = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80'; // Placeholder padrão

            stmt.run([id, name, brand, unit, barcode, stock, price, clubPrice, category, image], (err) => {
                if (err) {
                    console.error(`Erro ao inserir ID ${id} (${name}):`, err.message);
                }
            });
            count++;
        }

        stmt.finalize(() => {
            console.log(`--- Sincronização Finalizada! ${count} produtos importados. ---`);
            db.close();
        });
    });
}

syncErp().catch(err => {
    console.error('Erro crítico na sincronização:', err);
});
