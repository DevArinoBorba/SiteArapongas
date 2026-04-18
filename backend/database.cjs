const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'produtos.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar com a base de dados SQLite:', err.message);
    } else {
        console.log('Conectado na base de dados SQLite.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // 1. Tabela de Produtos
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            brand TEXT,
            price REAL NOT NULL,
            unit TEXT,
            image TEXT,
            barcode TEXT,
            category TEXT,
            stock INTEGER DEFAULT 0,
            club_price REAL
        )`, (err) => {
            if (err) console.error('Erro ao criar tabela products:', err.message);
            else console.log('Tabela products pronta.');
        });

        // 2. Tabela de Usuários
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            password TEXT NOT NULL
        )`, (err) => {
            if (!err) {
                db.get('SELECT COUNT(*) as count FROM users', (e, row) => {
                    if (row && row.count === 0) {
                        db.run("INSERT INTO users (username, password) VALUES ('admin', 'admin')");
                    }
                });
            }
        });

        // 3. Tabela de Métricas
        db.run(`CREATE TABLE IF NOT EXISTS metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            product_id INTEGER,
            product_name TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error('Erro ao criar tabela metrics:', err.message);
            else console.log('Tabela metrics pronta.');
        });

        // 4. Tabela de Membros do Clube
        db.run(`CREATE TABLE IF NOT EXISTS club_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cpf TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            birth_date TEXT,
            address TEXT,
            phone TEXT,
            preferred_store TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error('Erro ao criar tabela club_members:', err.message);
            else {
                console.log('Tabela club_members pronta.');
                // Inserir membro de teste se vazio
                db.get('SELECT COUNT(*) as count FROM club_members', (e, row) => {
                    if (row && row.count === 0) {
                        db.run("INSERT INTO club_members (cpf, name) VALUES ('123.456.789-00', 'Cliente Premium Arapongas')");
                        console.log('Membro de teste inserido.');
                    }
                });
            }
        });

        // 5. Carga Inicial de Mock (Apenas se estiver vazio)
        checkAndMockData();
    });
}

function checkAndMockData() {
    db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
        if (!err && row.count === 0) {
            console.log('Injetando dados mock iniciais...');
            const stmt = db.prepare('INSERT INTO products (name, brand, price, unit, image, barcode, category, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            stmt.run(['Maçã Fuji Fresca Kg', 'Arapongas Supermercados', 9.98, 'kg', '/apple.png', '0000000', 'Hortifruti', 50]);
            stmt.run(['Arroz Branco Tipo 1 5kg', 'Tio João', 26.90, 'un', 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?w=400&q=80', '1111111', 'Mercearia', 20]);
            stmt.finalize();
        }
    });
}

module.exports = db;

