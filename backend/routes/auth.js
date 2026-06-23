// ============================================================
// routes/auth.js
// Rota de autenticação — POST /api/auth/login
// ============================================================

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const fs       = require('fs');
const path     = require('path');

const { CHAVE_SECRETA } = require('../middleware/auth');

const router   = express.Router();
const ARQUIVO  = path.join(__dirname, '../data/users.json');

// ── Utilitário: lê o arquivo users.json ──────────────────────
function lerUsuarios() {
  const conteudo = fs.readFileSync(ARQUIVO, 'utf-8');
  return JSON.parse(conteudo);
}

// ── POST /api/auth/login ──────────────────────────────────────
// Body esperado: { "email": "...", "password": "..." }
// Retorna:       { "token": "...", "usuario": { ... } }
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Validação básica dos campos
  if (!email || !password) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
  }

  const usuarios = lerUsuarios();

  // Busca o usuário pelo e-mail (case-insensitive)
  const usuario = usuarios.find(
    u => u.email.toLowerCase() === email.toLowerCase()
  );

  if (!usuario) {
    // Retorna a mesma mensagem para e-mail ou senha errados
    // (evita revelar se o e-mail existe)
    return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
  }

  // Compara a senha com o hash armazenado
  const senhaCorreta = bcrypt.compareSync(password, usuario.senha);

  if (!senhaCorreta) {
    return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
  }

  // Gera o token JWT com validade de 8 horas
  const token = jwt.sign(
    {
      id:     usuario.id,
      email:  usuario.email,
      nome:   usuario.nome,
      perfil: usuario.perfil   // 'cliente' ou 'admin'
    },
    CHAVE_SECRETA,
    { expiresIn: '8h' }
  );

  // Retorna o token e os dados públicos do usuário
  res.json({
    token,
    usuario: {
      id:     usuario.id,
      nome:   usuario.nome,
      email:  usuario.email,
      perfil: usuario.perfil
    }
  });
});

module.exports = router;
