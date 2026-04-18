const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'produtos.sqlite');
const db = new sqlite3.Database(dbPath);

const erpData = [
  { id: 1, name: "Bebida Lactea Uht Choc Latco 200ml", brand: "Latco", unit: "LT", barcode: "7898133290190", stock: 1, price: 15.90, club_price: 0.00, category: "Laticínios", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80" },
  { id: 2, name: "Macarrão Nissin Miojo T. Mônica Tomate Suave 85g", brand: "Nissin", unit: "KG", barcode: "7891079001028", stock: 50, price: 3.49, club_price: 0.00, category: "Mercearia", image: "https://images.unsplash.com/photo-1552611052-33e04de081de?w=400&q=80" },
  { id: 7, name: "Iogurte Nestle Morango C/Calda 150g", brand: "Nestle", unit: "KG", barcode: "7891000340004", stock: 1, price: 5.29, club_price: 0.00, category: "Laticínios", image: "https://images.unsplash.com/photo-1563208599-2787f08cd50c?w=400&q=80" },
  { id: 10, name: "Abraçadeira Dia a Dia 13-19 02", brand: "Dia a Dia", unit: "UN", barcode: "7898072576577", stock: 1, price: 7.99, club_price: 0.00, category: "Utilidades", image: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400&q=80" },
  { id: 12, name: "Absorvente Ob Original Super", brand: "O.B.", unit: "UN", barcode: "7891010010577", stock: 1, price: 16.99, club_price: 0.00, category: "Higiene", image: "https://images.unsplash.com/photo-1584308661523-9363de7c1647?w=400&q=80" },
  { id: 21, name: "Adaptador 3/4 Dia a Dia Curto", brand: "Dia a Dia", unit: "UN", barcode: "7898072570674", stock: 1, price: 3.00, club_price: 0.00, category: "Utilidades", image: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400&q=80" },
  { id: 22, name: "Adesivo Cola Cano Dia a Dia 17g", brand: "Dia a Dia", unit: "KG", barcode: "7898072570704", stock: 1, price: 8.99, club_price: 0.00, category: "Utilidades", image: "https://images.unsplash.com/photo-1567011447565-385058092ecb?w=400&q=80" },
  { id: 23, name: "Adoçante Adocyl 100ml", brand: "Adocyl", unit: "LT", barcode: "7891104393104", stock: 12, price: 6.99, club_price: 0.00, category: "Mercearia", image: "https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=400&q=80" },
  { id: 25, name: "Adoçante Zero Cal 100ml", brand: "Zero Cal", unit: "LT", barcode: "7896094910904", stock: 12, price: 11.99, club_price: 0.00, category: "Mercearia", image: "https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=400&q=80" },
  { id: 27, name: "Água Tônica Antarctica Lt 350ml", brand: "Antarctica", unit: "LT", barcode: "7891991000840", stock: 12, price: 4.59, club_price: 0.00, category: "Bebidas", image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80" },
  { id: 29, name: "Cachaça Adoçada Jamel 965ml", brand: "Jamel", unit: "LT", barcode: "7898172660107", stock: 12, price: 18.99, club_price: 0.00, category: "Adega", image: "https://images.unsplash.com/photo-1569058242252-623df46b5025?w=400&q=80" },
  { id: 30, name: "Cachaça 51 965ml", brand: "51", unit: "LT", barcode: "7896002100014", stock: 1, price: 18.99, club_price: 0.00, category: "Adega", image: "https://images.unsplash.com/photo-1569058242252-623df46b5025?w=400&q=80" }
];

db.serialize(() => {
  console.log('--- Iniciando Limpeza e Importação ERP ---');
  
  // Limpar produtos antigos
  db.run('DELETE FROM products', (err) => {
    if (err) console.error('Erro ao limpar produtos:', err.message);
    else console.log('Tabela de produtos limpa com sucesso.');
  });

  // Resetar autoincrement se necessário (SQLite)
  db.run("DELETE FROM sqlite_sequence WHERE name='products'");

  // Inserir novos produtos
  const stmt = db.prepare('INSERT INTO products (id, name, brand, price, club_price, unit, image, barcode, category, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  
  erpData.forEach(p => {
    stmt.run([p.id, p.name, p.brand, p.price, p.club_price, p.unit, p.image, p.barcode, p.category, p.stock], (err) => {
      if (err) console.error(`Erro ao inserir ${p.name}:`, err.message);
      else console.log(`Produto inserido: ${p.name}`);
    });
  });

  stmt.finalize(() => {
    console.log('--- Importação Concluída ---');
    db.close();
  });
});
