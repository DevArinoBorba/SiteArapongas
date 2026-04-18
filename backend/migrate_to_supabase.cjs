const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const supabase = require('./supabase.cjs');

const dbPath = path.resolve(__dirname, 'produtos.sqlite');
const db = new sqlite3.Database(dbPath);

async function migrate() {
    console.log('--- Iniciando Migração SQLite -> Supabase ---');

    // 1. Migrar Produtos
    console.log('Migrando Produtos...');
    db.all('SELECT * FROM products', [], async (err, rows) => {
        if (err) return console.error(err);
        if (rows.length > 0) {
            // Remover 'id' para deixar o Supabase gerar novos se necessário, 
            // ou manter 'id' se quiser preservar os links.
            // Aqui preservamos o ID para manter consistência com métricas.
            const { error } = await supabase.from('products').upsert(rows);
            if (error) console.error('Erro produtos:', error);
            else console.log(`${rows.length} produtos migrados.`);
        }
    });

    // 2. Migrar Usuários
    console.log('Migrando Usuários...');
    db.all('SELECT * FROM users', [], async (err, rows) => {
        if (err) return console.error(err);
        if (rows.length > 0) {
            const { error } = await supabase.from('users').upsert(rows);
            if (error) console.error('Erro usuários:', error);
            else console.log(`${rows.length} usuários migrados.`);
        }
    });

    // 3. Migrar Membros do Clube
    console.log('Migrando Membros...');
    db.all('SELECT * FROM club_members', [], async (err, rows) => {
        if (err) return console.error(err);
        if (rows.length > 0) {
            const { error } = await supabase.from('club_members').upsert(rows);
            if (error) console.error('Erro membros:', error);
            else console.log(`${rows.length} membros migrados.`);
        }
    });
}

migrate();
