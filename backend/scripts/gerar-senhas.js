// ============================================================
// scripts/gerar-senhas.js
// Execute UMA VEZ para gerar os hashes bcrypt das senhas
// e atualizar o arquivo data/users.json
//
// Como usar:
//   cd backend
//   node scripts/gerar-senhas.js
// ============================================================

const bcrypt = require('bcryptjs');
const fs     = require('fs');
const path   = require('path');

// Senhas em texto puro para gerar os hashes
const usuarios = [
  { id: 'admin-001', nome: 'Administrador Omega Electric', email: 'admin@omega-electric.com.br', senha: 'admin2026',  perfil: 'admin'   },
  { id: 'cli-001',   nome: 'Cliente Demo',                 email: 'cliente@demo.com',             senha: 'omega123',  perfil: 'cliente' },
  { id: 'cli-002',   nome: 'Energisa PB',                  email: 'contato@energisa.com.br',       senha: 'energisa',  perfil: 'cliente' },
  { id: 'cli-003',   nome: 'COSERN',                       email: 'engenharia@cosern.com.br',      senha: 'cosern123', perfil: 'cliente' },
];

const agora = new Date().toISOString();

const usuariosComHash = usuarios.map(u => ({
  id:       u.id,
  nome:     u.nome,
  email:    u.email,
  senha:    bcrypt.hashSync(u.senha, 10),  // custo 10 = seguro e rápido
  perfil:   u.perfil,
  criadoEm: agora
}));

const destino = path.join(__dirname, '../data/users.json');
fs.writeFileSync(destino, JSON.stringify(usuariosComHash, null, 2), 'utf-8');

console.log('✅ Senhas geradas e gravadas em data/users.json');
console.log('');
console.log('Credenciais de acesso:');
console.log('  admin@omega-electric.com.br  →  admin2026');
console.log('  cliente@demo.com             →  omega123');
console.log('  contato@energisa.com.br      →  energisa');
console.log('  engenharia@cosern.com.br     →  cosern123');
