const supabase = require('./supabase.cjs');

async function createAdmin() {
    console.log('--- Criando Usuário Admin no Supabase ---');
    
    // Usamos upsert para evitar erro se já existir um admin
    const { data, error } = await supabase
        .from('users')
        .upsert([{ id: 1, username: 'admin', password: 'admin' }]);

    if (error) {
        console.error('Erro ao criar admin:', error.message);
    } else {
        console.log('✅ Usuário "admin" com senha "admin" criado com sucesso!');
        console.log('Já pode tentar logar no site!');
    }
}

createAdmin();
